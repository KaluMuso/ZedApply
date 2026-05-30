"""Employer Lenco checkout verification."""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any

from supabase import Client

from app.schemas.employer import EMPLOYER_TIER_PRICES
from app.services.lenco import (
    LencoApiError,
    amount_to_ngwee,
    fetch_collection_status,
    map_lenco_payment_method,
    normalize_collection_status,
)

logger = logging.getLogger(__name__)


def _first_row(data: Any) -> dict[str, Any] | None:
    if isinstance(data, list):
        return data[0] if data else None
    return data if isinstance(data, dict) else None


def _parse_employer_reference(reference: str) -> str | None:
    """Extract employer_id from zedapply-emp-{uuid}-... references."""
    parts = reference.split("-")
    if len(parts) < 4 or parts[0] != "zedapply" or parts[1] != "emp":
        return None
    candidate = "-".join(parts[2:7]) if len(parts) >= 7 else parts[2]
    if len(candidate) == 36:
        return candidate
    return parts[2] if len(parts[2]) == 36 else None


async def activate_employer_subscription(
    supabase: Client,
    *,
    employer_id: str,
    tier: str,
    lenco_ref: str | None,
) -> dict[str, Any]:
    now = datetime.now(timezone.utc)
    period_end = now + timedelta(days=30)
    existing = (
        supabase.table("employer_subscriptions")
        .select("*")
        .eq("employer_id", employer_id)
        .limit(1)
        .execute()
    )
    row = _first_row(existing.data)
    payload = {
        "tier": tier,
        "status": "active",
        "current_period_end": period_end.isoformat(),
        "contacts_used_this_period": 0,
        "lenco_subscription_ref": lenco_ref,
    }
    if row:
        supabase.table("employer_subscriptions").update(payload).eq("id", row["id"]).execute()
    else:
        payload["employer_id"] = employer_id
        supabase.table("employer_subscriptions").insert(payload).execute()
    return payload


async def verify_employer_lenco_payment(
    supabase: Client,
    *,
    employer_id: str,
    user_id: str,
    reference: str,
    tier: str,
) -> tuple[int, dict[str, Any]]:
    if tier not in EMPLOYER_TIER_PRICES:
        return 422, {"detail": "Invalid employer tier"}

    ref_employer = _parse_employer_reference(reference)
    if ref_employer and ref_employer != employer_id:
        return 403, {"detail": "Payment reference does not match your employer"}

    expected = EMPLOYER_TIER_PRICES[tier]

    payment = (
        supabase.table("payments")
        .select("*")
        .eq("user_id", user_id)
        .eq("provider_ref", reference)
        .limit(1)
        .execute()
    )
    pay_row = _first_row(payment.data)
    if pay_row and pay_row.get("status") == "completed":
        return 200, {
            "status": "completed",
            "tier": tier,
            "reference": reference,
            "message": "Payment already verified.",
        }

    try:
        collection = await fetch_collection_status(reference)
    except LencoApiError as exc:
        if exc.status_code == 404:
            return 502, {"detail": "Payment reference not found at Lenco."}
        return 502, {"detail": "Could not verify payment with Lenco."}

    lenco_status = normalize_collection_status(collection)
    amount_ngwee = amount_to_ngwee(collection) or expected
    lenco_ref = collection.get("lencoReference") or collection.get("id")
    method_label = map_lenco_payment_method(collection)

    if lenco_status == "failed":
        return 402, {"detail": collection.get("reasonForFailure") or "Payment failed at Lenco."}

    if lenco_status == "processing":
        return 202, {
            "status": "processing",
            "tier": tier,
            "reference": reference,
            "message": "Payment is processing; subscription activates when Lenco confirms.",
        }

    if amount_ngwee < expected:
        return 402, {"detail": f"Insufficient amount: expected K{expected // 100}"}

    if not pay_row:
        sub_user = (
            supabase.table("subscriptions")
            .select("id")
            .eq("user_id", user_id)
            .limit(1)
            .execute()
        )
        sub_id = (_first_row(sub_user.data) or {}).get("id")
        supabase.table("payments").insert(
            {
                "user_id": user_id,
                "subscription_id": sub_id,
                "amount": amount_ngwee,
                "currency": "ZMW",
                "payment_method": method_label,
                "provider": "lenco",
                "provider_ref": reference,
                "status": "completed",
                "completed_at": datetime.now(timezone.utc).isoformat(),
                "webhook_data": {
                    **collection,
                    "employer_id": employer_id,
                    "employer_tier": tier,
                },
            }
        ).execute()
    else:
        supabase.table("payments").update(
            {
                "status": "completed",
                "completed_at": datetime.now(timezone.utc).isoformat(),
                "webhook_data": {
                    **collection,
                    "employer_id": employer_id,
                    "employer_tier": tier,
                },
            }
        ).eq("id", pay_row["id"]).execute()

    await activate_employer_subscription(
        supabase,
        employer_id=employer_id,
        tier=tier,
        lenco_ref=str(lenco_ref) if lenco_ref else None,
    )

    label = "Employer Lite" if tier == "lite" else "Employer Pro"
    return 200, {
        "status": "completed",
        "tier": tier,
        "reference": reference,
        "message": f"{label} plan activated.",
    }
