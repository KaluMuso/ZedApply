"""Subscription billing-period activation after successful payment."""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from supabase import Client

from app.core.config import get_settings
from app.schemas.subscription import TIER_LIMITS

logger = logging.getLogger(__name__)


def _parse_dt(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except (TypeError, ValueError):
        return None


def _period_end(
    *,
    existing_end: datetime | None,
    now: datetime,
    period_days: int,
) -> datetime:
    base = existing_end if (existing_end and existing_end > now) else now
    return base + timedelta(days=period_days)


def activate_subscription_after_payment(
    supabase: Client,
    *,
    user_id: str,
    payment_id: str,
    new_tier: str,
    subscription_row: dict[str, Any] | None,
    lenco_subscription_ref: Optional[str] = None,
    now: datetime | None = None,
) -> dict[str, str]:
    """Apply paid-tier activation after a successful payment webhook.

    Upserts the user's single subscriptions row (schema enforces one row per
    user) and mirrors billing windows onto users.* for expiry cron + UI.
    """
    current = now or datetime.now(timezone.utc)
    settings = get_settings()
    period_days = settings.subscription_period_days
    new_limit = TIER_LIMITS[new_tier]

    existing_end = _parse_dt(
        (subscription_row or {}).get("current_period_end"),
    )
    period_start = current
    period_end = _period_end(
        existing_end=existing_end,
        now=current,
        period_days=period_days,
    )
    period_iso = {
        "start": period_start.isoformat(),
        "end": period_end.isoformat(),
    }

    sub_id = (subscription_row or {}).get("id")
    sub_payload: dict[str, Any] = {
        "tier": new_tier,
        "status": "active",
        "matches_limit": new_limit,
        "current_period_start": period_iso["start"],
        "current_period_end": period_iso["end"],
        "cancelled_at": None,
        "updated_at": period_iso["start"],
    }
    if lenco_subscription_ref:
        sub_payload["lenco_subscription_ref"] = lenco_subscription_ref

    if sub_id:
        if not (subscription_row or {}).get("started_at"):
            sub_payload["started_at"] = period_iso["start"]
        supabase.table("subscriptions").update(sub_payload).eq("id", sub_id).execute()
    else:
        insert_row = {
            "user_id": user_id,
            "tier": new_tier,
            "status": "active",
            "matches_limit": new_limit,
            "started_at": period_iso["start"],
            "current_period_start": period_iso["start"],
            "current_period_end": period_iso["end"],
            **(
                {"lenco_subscription_ref": lenco_subscription_ref}
                if lenco_subscription_ref
                else {}
            ),
        }
        inserted = supabase.table("subscriptions").insert(insert_row).execute()
        if inserted.data:
            sub_id = inserted.data[0].get("id")

    user_row = (
        supabase.table("users")
        .select("subscription_started_at")
        .eq("id", user_id)
        .limit(1)
        .execute()
    )
    user_data = (user_row.data or [{}])[0] if isinstance(user_row.data, list) else user_row.data
    user_update: dict[str, Any] = {
        "subscription_tier": new_tier,
        "subscription_expires_at": period_iso["end"],
        "subscription_renews_at": period_iso["end"],
    }
    if not (user_data or {}).get("subscription_started_at"):
        user_update["subscription_started_at"] = period_iso["start"]

    supabase.table("users").update(user_update).eq("id", user_id).execute()

    if sub_id:
        supabase.table("payments").update({
            "subscription_id": sub_id,
        }).eq("id", payment_id).execute()

    logger.info(
        "Subscription activated: user=%s tier=%s period_end=%s sub_id=%s",
        user_id,
        new_tier,
        period_iso["end"],
        sub_id,
    )
    return period_iso
