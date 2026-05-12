"""Tests for the DPO Pay webhook handler and the subscription/pay no-Lenco guard.

Covers slice 2D-1c hardening:
- Idempotency: a webhook for an already-completed payment must NOT re-upgrade.
- Period-end safety: stack 30 days on top of remaining paid days, never truncate.
- Tier mapping: exact-price reverse-lookup against TIER_PRICES + TIER_LIMITS.
- Unknown-amount fallback: log a warning and stamp webhook_data with the
  resolved tier for human review.
- Subscription/pay rejects payment_method values starting with 'lenco_'
  (the live Lenco initiation path was reverted in this slice).
"""
import logging
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from tests.conftest import FakeSupabaseQuery


class _UpdateSpyQuery(FakeSupabaseQuery):
    """FakeSupabaseQuery that records every update() call's payload.

    Use to assert which writes the route did or did not make. Modeled on the
    same subclass-and-extend discipline as test_subscription.py's _SingleQuery
    (intentionally inline — keeps conftest.py untouched).
    """

    def __init__(self, data=None):
        super().__init__(data=data)
        self.update_calls: list = []

    def update(self, data):
        self.update_calls.append(data)
        return self

    def single(self):
        self._single = True
        return self

    def execute(self):
        result = MagicMock()
        if getattr(self, "_single", False) and self._data:
            result.data = self._data[0] if isinstance(self._data, list) else self._data
        else:
            result.data = self._data
        result.count = getattr(self, "_count", None)
        return result


def _patch_dpo_helpers(parsed_token: str = "TOK-123", is_paid: bool = True):
    """Return (parse_patch, verify_patch) decorators wired to standard responses."""
    parse = patch(
        "app.services.dpo_pay.parse_dpo_webhook_xml",
        return_value={
            "company_ref": "",
            "transaction_token": parsed_token,
            "transaction_ref": "REF-1",
            "transaction_amount": "125.00",
            "transaction_currency": "ZMW",
            "result_code": "000",
            "result_explanation": "ok",
            "customer_phone": "+260971234567",
        },
    )
    verify = patch(
        "app.services.dpo_pay.verify_payment",
        new_callable=AsyncMock,
        return_value={
            "is_paid": is_paid,
            "result_code": "000" if is_paid else "002",
            "result_explanation": "ok" if is_paid else "declined",
            "transaction_ref": "REF-1",
            "customer_phone": "+260971234567",
            "amount": "125.00",
            "currency": "ZMW",
        },
    )
    return parse, verify


def _payment_row(amount: int, status: str = "pending", existing_end: str | None = None):
    return {
        "id": "pay-001",
        "user_id": "test-user-id",
        "amount": amount,
        "status": status,
        "subscriptions": {
            "id": "sub-1",
            "user_id": "test-user-id",
            "tier": "free",
            "current_period_end": existing_end,
        },
    }


def _post_dpo(client):
    return client.post("/api/v1/webhooks/dpo", content=b"<API3G/>")


# ── 1. Idempotency ───────────────────────────────────────────────────────


def test_dpo_webhook_idempotency(client, fake_supabase):
    """A webhook for an already-completed payment returns already_processed
    and does NOT touch the subscription."""
    fake_supabase.set_table(
        "payments", _UpdateSpyQuery(data=[_payment_row(amount=12500, status="completed")])
    )
    sub_spy = _UpdateSpyQuery(data=[{"id": "sub-1", "user_id": "test-user-id"}])
    fake_supabase.set_table("subscriptions", sub_spy)
    fake_supabase.set_table("users", _UpdateSpyQuery(data=[{"phone": "+260971234567"}]))

    parse, verify = _patch_dpo_helpers()
    with parse, verify, patch(
        "app.api.v1.webhooks.send_whatsapp_message", new_callable=AsyncMock
    ), patch(
        "app.api.v1.webhooks.send_payment_confirmation_email", new_callable=AsyncMock
    ):
        resp = _post_dpo(client)

    assert resp.status_code == 200
    assert resp.json() == {"status": "already_processed"}
    assert sub_spy.update_calls == []  # subscription must not be re-upgraded


# ── 2. Period-end safety ─────────────────────────────────────────────────


def test_dpo_webhook_period_end_safety(client, fake_supabase):
    """When a webhook arrives mid-cycle, new period_end stacks on top of the
    remaining paid time rather than truncating to now+30d."""
    now = datetime.now(timezone.utc)
    existing_end = now + timedelta(days=20)

    fake_supabase.set_table(
        "payments",
        _UpdateSpyQuery(
            data=[_payment_row(amount=12500, existing_end=existing_end.isoformat())]
        ),
    )
    sub_spy = _UpdateSpyQuery(data=[{"id": "sub-1", "user_id": "test-user-id"}])
    fake_supabase.set_table("subscriptions", sub_spy)
    fake_supabase.set_table("users", _UpdateSpyQuery(data=[{"phone": "+260971234567"}]))

    parse, verify = _patch_dpo_helpers()
    with parse, verify, patch(
        "app.api.v1.webhooks.send_whatsapp_message", new_callable=AsyncMock
    ), patch(
        "app.api.v1.webhooks.send_payment_confirmation_email", new_callable=AsyncMock
    ):
        resp = _post_dpo(client)

    assert resp.status_code == 200
    assert len(sub_spy.update_calls) == 1
    end_iso = sub_spy.update_calls[0]["current_period_end"]
    new_end = datetime.fromisoformat(end_iso)
    delta = new_end - now
    # Expected ≈ 50 days (20 remaining + 30 new). Wide jitter window absorbs
    # test runtime; the assertion that fails the *old* code is delta > 31d.
    assert timedelta(days=49) < delta < timedelta(days=51), (
        f"Expected ~50d (20 remaining + 30 new), got {delta}"
    )


# ── 3. Tier mapping by exact price ───────────────────────────────────────


@pytest.mark.parametrize(
    "amount,expected_tier,expected_limit",
    [
        (12500, "starter", 50),
        (25000, "professional", 125),
        (50000, "super_standard", 99999),
    ],
)
def test_dpo_webhook_tier_mapping_exact_price(
    client, fake_supabase, amount, expected_tier, expected_limit
):
    """Each canonical price maps to the canonical tier + TIER_LIMITS quota."""
    fake_supabase.set_table(
        "payments", _UpdateSpyQuery(data=[_payment_row(amount=amount)])
    )
    sub_spy = _UpdateSpyQuery(data=[{"id": "sub-1", "user_id": "test-user-id"}])
    fake_supabase.set_table("subscriptions", sub_spy)
    fake_supabase.set_table("users", _UpdateSpyQuery(data=[{"phone": "+260971234567"}]))

    parse, verify = _patch_dpo_helpers()
    with parse, verify, patch(
        "app.api.v1.webhooks.send_whatsapp_message", new_callable=AsyncMock
    ), patch(
        "app.api.v1.webhooks.send_payment_confirmation_email", new_callable=AsyncMock
    ):
        resp = _post_dpo(client)

    assert resp.status_code == 200
    assert resp.json() == {"status": "completed"}
    assert len(sub_spy.update_calls) == 1
    assert sub_spy.update_calls[0]["tier"] == expected_tier
    assert sub_spy.update_calls[0]["matches_limit"] == expected_limit


def test_dpo_webhook_tier_mapping_unknown_amount_logs_warning(
    client, fake_supabase, caplog
):
    """An off-price amount logs a warning and falls back defensively to the
    highest tier whose price is <= amount (17500 → starter)."""
    fake_supabase.set_table(
        "payments", _UpdateSpyQuery(data=[_payment_row(amount=17500)])
    )
    sub_spy = _UpdateSpyQuery(data=[{"id": "sub-1", "user_id": "test-user-id"}])
    fake_supabase.set_table("subscriptions", sub_spy)
    fake_supabase.set_table("users", _UpdateSpyQuery(data=[{"phone": "+260971234567"}]))

    parse, verify = _patch_dpo_helpers()
    with caplog.at_level(logging.WARNING), parse, verify, patch(
        "app.api.v1.webhooks.send_whatsapp_message", new_callable=AsyncMock
    ), patch(
        "app.api.v1.webhooks.send_payment_confirmation_email", new_callable=AsyncMock
    ):
        resp = _post_dpo(client)

    assert resp.status_code == 200
    assert "unknown amount 17500" in caplog.text
    assert sub_spy.update_calls[0]["tier"] == "starter"
    assert sub_spy.update_calls[0]["matches_limit"] == 50


# ── 4. Subscription/pay now accepts lenco method (Lenco-frontend slice) ──


def test_subscription_pay_accepts_lenco_method(client, auth_headers, fake_supabase):
    """Lenco initiation was re-enabled when the signed webhook handler
    shipped. The /pay route should now create a pending payment row with
    provider='lenco' and return 200 even when LENCO_API_KEY isn't set
    (the service degrades gracefully and the row stays pending until
    manual intervention)."""
    fake_supabase.set_table(
        "subscriptions",
        _UpdateSpyQuery(data=[{"id": "sub-1"}]),
    )
    fake_supabase.set_table(
        "payments",
        FakeSupabaseQuery(data=[{"id": "pay-lenco-1"}]),
    )
    resp = client.post(
        "/api/v1/subscription/pay",
        headers=auth_headers,
        json={
            "tier": "starter",
            "payment_method": "lenco",
            "phone": "+260971234567",
        },
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["transaction_id"] == "pay-lenco-1"
