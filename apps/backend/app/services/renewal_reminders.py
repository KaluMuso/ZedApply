"""Send subscription renewal reminder emails before period end."""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any

from supabase import Client

from app.core.config import get_settings
from app.core.tier_gating import TIER_DISPLAY
from app.services.email import send_renewal_reminder_email
from app.services.tier_config import get_tier_prices

logger = logging.getLogger(__name__)

RENEWAL_KIND = "email_renewal_reminder"


def _period_end_date(value: Any) -> datetime | None:
    if not value:
        return None
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    try:
        parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
    except (TypeError, ValueError):
        return None


async def run_renewal_reminder_emails(supabase: Client) -> dict[str, int]:
    """Email paid users whose billing period ends in N days (default 3).

    Skips subscriptions with cancelled_at set. Dedupes via billing_email_log.
    """
    settings = get_settings()
    days = settings.subscription_renewal_reminder_days
    now = datetime.now(timezone.utc)
    target_day = (now + timedelta(days=days)).date()
    window_start = datetime.combine(target_day, datetime.min.time(), tzinfo=timezone.utc)
    window_end = window_start + timedelta(days=1)

    tier_prices = await get_tier_prices(supabase)
    sent = skipped = failed = 0

    result = (
        supabase.table("subscriptions")
        .select("user_id, tier, current_period_end, cancelled_at")
        .neq("tier", "free")
        .eq("status", "active")
        .is_("cancelled_at", "null")
        .gte("current_period_end", window_start.isoformat())
        .lt("current_period_end", window_end.isoformat())
        .execute()
    )

    for sub in result.data or []:
        user_id = sub["user_id"]
        tier = sub.get("tier") or "starter"
        period_end = _period_end_date(sub.get("current_period_end"))
        if not period_end:
            skipped += 1
            continue

        period_end_date = period_end.date().isoformat()
        existing = (
            supabase.table("billing_email_log")
            .select("id")
            .eq("user_id", user_id)
            .eq("kind", RENEWAL_KIND)
            .eq("period_end", period_end_date)
            .limit(1)
            .execute()
        )
        if existing.data:
            skipped += 1
            continue

        price_ngwee = tier_prices.get(tier, 0)
        ok = await send_renewal_reminder_email(
            user_id=user_id,
            tier=tier,
            tier_label=TIER_DISPLAY.get(tier, tier),
            price_ngwee=price_ngwee,
            period_end=period_end,
            supabase=supabase,
        )
        if ok:
            supabase.table("billing_email_log").insert(
                {
                    "user_id": user_id,
                    "kind": RENEWAL_KIND,
                    "period_end": period_end_date,
                }
            ).execute()
            sent += 1
        else:
            failed += 1

    logger.info(
        "renewal_reminders: sent=%s skipped=%s failed=%s target_day=%s",
        sent,
        skipped,
        failed,
        target_day,
    )
    return {"sent": sent, "skipped": skipped, "failed": failed}
