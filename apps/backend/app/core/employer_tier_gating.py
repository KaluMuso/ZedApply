"""Employer subscription tiers — contact quota gates."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException, status
from supabase import Client

from app.schemas.employer import EMPLOYER_CONTACT_LIMITS, EMPLOYER_TIER_PRICES


def _first_row(data: Any) -> dict[str, Any] | None:
    if isinstance(data, list):
        return data[0] if data else None
    return data if isinstance(data, dict) else None


async def load_employer_membership(
    user_id: str, supabase: Client
) -> tuple[str, dict[str, Any], dict[str, Any]]:
    """Return (employer_id, employer row, employer_users seat row)."""
    seat_res = (
        supabase.table("employer_users")
        .select("id, employer_id, role, accepted_at")
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    seat = _first_row(seat_res.data)
    if not seat:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not linked to an employer account",
        )
    if seat.get("accepted_at") is None and seat.get("role") != "owner":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accept your employer invite before continuing",
        )

    employer_id = str(seat["employer_id"])
    emp_res = (
        supabase.table("employers")
        .select("id, company_name, verified")
        .eq("id", employer_id)
        .limit(1)
        .execute()
    )
    employer = _first_row(emp_res.data)
    if not employer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employer not found",
        )
    return employer_id, employer, seat


async def load_active_employer_subscription(
    employer_id: str, supabase: Client
) -> dict[str, Any] | None:
    res = (
        supabase.table("employer_subscriptions")
        .select("*")
        .eq("employer_id", employer_id)
        .limit(1)
        .execute()
    )
    sub = _first_row(res.data)
    if not sub or sub.get("status") != "active":
        return None
    period_end = sub.get("current_period_end")
    if period_end:
        try:
            end = datetime.fromisoformat(str(period_end).replace("Z", "+00:00"))
            if end < datetime.now(timezone.utc):
                return None
        except (TypeError, ValueError):
            pass
    return sub


def contact_limit_for_tier(tier: str) -> int:
    return EMPLOYER_CONTACT_LIMITS.get(tier, 0)


async def require_employer_subscription(
    employer_id: str, supabase: Client, *, allow_viewer: bool = False
) -> dict[str, Any]:
    sub = await load_active_employer_subscription(employer_id, supabase)
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Active employer subscription required. Upgrade at /employer/billing.",
        )
    return sub


async def assert_contact_quota(
    employer_id: str, sub: dict[str, Any], supabase: Client
) -> None:
    tier = str(sub.get("tier") or "lite")
    limit = contact_limit_for_tier(tier)
    used = int(sub.get("contacts_used_this_period") or 0)
    if limit < 99999 and used >= limit:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                f"Monthly contact limit reached ({limit} on Employer "
                f"{'Lite' if tier == 'lite' else 'Pro'}). "
                "Upgrade to Pro for unlimited contacts."
            ),
        )


async def increment_contact_usage(employer_id: str, supabase: Client) -> int:
    sub = await load_active_employer_subscription(employer_id, supabase)
    if not sub:
        return 0
    new_used = int(sub.get("contacts_used_this_period") or 0) + 1
    supabase.table("employer_subscriptions").update(
        {"contacts_used_this_period": new_used}
    ).eq("id", sub["id"]).execute()
    return new_used


def price_ngwee_for_tier(tier: str) -> int:
    return EMPLOYER_TIER_PRICES.get(tier, 0)
