"""Shared payment → subscription fulfillment helpers."""

from __future__ import annotations

from datetime import datetime, timezone
import hashlib
import hmac
from typing import Any

from app.core.config import get_settings
from app.services.whatsapp import send_whatsapp_message


def tier_limits(requested_tier: str) -> dict[str, int]:
    tier_map = {
        "mwezi": {"matches_limit": 25},
        "bwino": {"matches_limit": 999999},
    }
    return tier_map.get(requested_tier, tier_map["mwezi"])


async def apply_subscription_upgrade(user_id: str, requested_tier: str, supabase) -> None:
    tier_config = tier_limits(requested_tier)

    sub_result = (
        supabase.table("subscriptions")
        .select("id")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    now_iso = datetime.now(timezone.utc).isoformat()
    if sub_result.data:
        supabase.table("subscriptions").update(
            {
                "tier": requested_tier,
                "status": "active",
                "matches_limit": tier_config["matches_limit"],
                "current_period_start": now_iso,
            }
        ).eq("id", sub_result.data[0]["id"]).execute()
    else:
        supabase.table("subscriptions").insert(
            {
                "user_id": user_id,
                "tier": requested_tier,
                "status": "active",
                "matches_limit": tier_config["matches_limit"],
                "current_period_start": now_iso,
            }
        ).execute()

    user_result = (
        supabase.table("users")
        .select("phone")
        .eq("id", user_id)
        .limit(1)
        .execute()
    )
    if user_result.data:
        phone = user_result.data[0]["phone"]
        supabase.table("users").update({"subscription_tier": requested_tier}).eq("id", user_id).execute()
        await send_whatsapp_message(
            phone,
            (
                f"*Payment successful!* Your plan is now *{requested_tier.capitalize()}*.\n\n"
                "Thank you for upgrading Zed CV. You can now continue with premium features."
            ),
        )


def verify_lenco_signature(raw_body: bytes, signature_header: str | None) -> bool:
    settings = get_settings()
    if settings.lenco_webhook_skip_verify:
        return True
    if not settings.lenco_secret_key:
        return False
    if not signature_header:
        return False

    webhook_hash_key = hashlib.sha256(settings.lenco_secret_key.encode("utf-8")).hexdigest()
    expected = hmac.new(
        webhook_hash_key.encode("utf-8"),
        raw_body,
        hashlib.sha512,
    ).hexdigest()
    return hmac.compare_digest(expected, signature_header.strip())


def find_payment_for_lenco(reference: str, lenco_reference: str, supabase) -> dict[str, Any] | None:
    for ref in (reference, lenco_reference):
        if not ref:
            continue
        payment_result = (
            supabase.table("payments")
            .select("id,user_id,status,webhook_data,provider_ref")
            .eq("provider_ref", ref)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        if payment_result.data:
            return payment_result.data[0]
    return None
