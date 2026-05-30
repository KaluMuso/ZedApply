"""Parse Lenco widget references and resolve payment rows safely."""
from __future__ import annotations

import re
import uuid
from typing import Any

from supabase import Client

_UUID_RE = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
    re.I,
)
# Pricing widget: zedapply-{user_uuid}-{epoch_ms}
_CONSUMER_REF_RE = re.compile(
    r"^zedapply-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})-(\d+)$",
    re.I,
)


def is_uuid_string(value: str) -> bool:
    if not value or not _UUID_RE.match(value.strip()):
        return False
    try:
        uuid.UUID(value.strip())
        return True
    except ValueError:
        return False


def parse_consumer_widget_reference(reference: str) -> tuple[str, int] | None:
    """Return (user_id, epoch_ms) from pricing widget references."""
    match = _CONSUMER_REF_RE.match(reference.strip())
    if not match:
        return None
    return match.group(1), int(match.group(2))


def find_lenco_payment_row(
    supabase: Client,
    *,
    company_ref: str,
    lenco_ref: str | None = None,
) -> dict[str, Any] | None:
    """Resolve a payments row without casting non-UUID refs to payments.id."""
    select = "*, subscriptions(id, user_id, tier, current_period_end)"
    base = supabase.table("payments").select(select)

    by_ref = base.eq("provider_ref", company_ref).limit(1).execute()
    if by_ref.data:
        return by_ref.data[0]

    if is_uuid_string(company_ref):
        by_id = (
            supabase.table("payments")
            .select(select)
            .eq("id", company_ref)
            .limit(1)
            .execute()
        )
        if by_id.data:
            return by_id.data[0]

    parsed = parse_consumer_widget_reference(company_ref)
    if parsed:
        user_id, _ts = parsed
        by_user_ref = (
            supabase.table("payments")
            .select(select)
            .eq("user_id", user_id)
            .eq("provider_ref", company_ref)
            .limit(1)
            .execute()
        )
        if by_user_ref.data:
            return by_user_ref.data[0]

    if lenco_ref:
        by_lenco = (
            supabase.table("payments")
            .select(select)
            .eq("provider_ref", lenco_ref)
            .limit(1)
            .execute()
        )
        if by_lenco.data:
            return by_lenco.data[0]

    return None


def ensure_pending_payment_for_widget_ref(
    supabase: Client,
    *,
    company_ref: str,
    amount_ngwee: int,
    webhook_payload: dict[str, Any],
) -> dict[str, Any] | None:
    """Create a pending payment when the webhook arrives before verify-payment."""
    parsed = parse_consumer_widget_reference(company_ref)
    if not parsed:
        return None
    user_id, _ts = parsed

    existing = find_lenco_payment_row(supabase, company_ref=company_ref, lenco_ref=None)
    if existing:
        return existing

    sub = (
        supabase.table("subscriptions")
        .select("id, user_id, tier, current_period_end")
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    if not sub.data:
        return None

    subscription_row = sub.data[0]
    insert = (
        supabase.table("payments")
        .insert(
            {
                "user_id": user_id,
                "subscription_id": subscription_row["id"],
                "amount": amount_ngwee,
                "currency": "ZMW",
                "payment_method": "lenco",
                "provider": "lenco",
                "provider_ref": company_ref,
                "status": "pending",
                "webhook_data": webhook_payload,
            }
        )
        .execute()
    )
    if not insert.data:
        return None
    row = insert.data[0]
    row["subscriptions"] = subscription_row
    return row
