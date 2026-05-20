"""Tests for subscription billing-period activation and match counting."""
import asyncio
from datetime import datetime, timezone
from unittest.mock import MagicMock

from tests.conftest import FakeSupabaseQuery
from app.services.matching import get_credited_match_count, _billing_period_start
from app.services.subscription_billing import activate_subscription_after_payment


class TrackingQuery(FakeSupabaseQuery):
    """Captures filter/update args for assertions."""

    def __init__(self, data=None, count=None):
        super().__init__(data=data, count=count)
        self.updates: list[dict] = []
        self.gte_filters: list[tuple] = []

    def update(self, data):
        self.updates.append(data)
        return self

    def gte(self, col, val):
        self.gte_filters.append((col, val))
        return self


class TestActivateSubscriptionAfterPayment:
    def test_sets_user_billing_columns_and_subscription_period(
        self, fake_supabase, monkeypatch
    ):
        monkeypatch.setenv("SUBSCRIPTION_PERIOD_DAYS", "30")
        from app.core.config import get_settings
        get_settings.cache_clear()

        subs_q = TrackingQuery(
            data=[
                {
                    "id": "sub-1",
                    "user_id": "user-1",
                    "current_period_end": None,
                    "started_at": None,
                }
            ]
        )
        users_q = TrackingQuery(
            data=[{"id": "user-1", "subscription_started_at": None}]
        )
        payments_q = TrackingQuery(data=[])
        fake_supabase.set_table("subscriptions", subs_q)
        fake_supabase.set_table("users", users_q)
        fake_supabase.set_table("payments", payments_q)

        now = datetime(2026, 5, 20, 12, 0, tzinfo=timezone.utc)
        result = activate_subscription_after_payment(
            fake_supabase,
            user_id="user-1",
            payment_id="pay-1",
            new_tier="starter",
            subscription_row={
                "id": "sub-1",
                "current_period_end": None,
            },
            lenco_subscription_ref="LEN-abc",
            now=now,
        )

        assert result["start"] and result["end"]
        assert subs_q.updates[-1]["tier"] == "starter"
        assert subs_q.updates[-1]["lenco_subscription_ref"] == "LEN-abc"
        assert users_q.updates[-1]["subscription_tier"] == "starter"
        assert users_q.updates[-1]["subscription_renews_at"] == result["end"]
        assert payments_q.updates[-1]["subscription_id"] == "sub-1"


class TestBillingPeriodMatchCount:
    def test_uses_subscription_current_period_start(self, fake_supabase):
        period_start = "2026-05-10T00:00:00+00:00"
        matches_q = TrackingQuery(data=[{"id": "m1"}], count=3)
        fake_supabase.set_table(
            "subscriptions",
            FakeSupabaseQuery(
                data=[{"status": "active", "current_period_start": period_start}]
            ),
        )
        fake_supabase.set_table("matches", matches_q)

        used = asyncio.run(get_credited_match_count("user-1", fake_supabase))
        assert used == 3
        assert ("credited_at", period_start) in matches_q.gte_filters

    def test_billing_period_start_from_subscription(self, fake_supabase):
        period_start = "2026-04-15T08:00:00+00:00"
        fake_supabase.set_table(
            "subscriptions",
            FakeSupabaseQuery(
                data=[{"status": "active", "current_period_start": period_start}]
            ),
        )
        start = asyncio.run(_billing_period_start("user-1", fake_supabase))
        assert start.isoformat().startswith("2026-04-15")
