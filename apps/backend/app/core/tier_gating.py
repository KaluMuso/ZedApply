"""Subscription tier limits and feature gates (Mwana / Mwizi / Wino).

Canonical tier keys: mwana, mwizi, wino. Legacy DB values (free, starter,
professional, super_standard) are normalized via TIER_ALIASES so migrations
and payments can transition without breaking reads.
"""
from __future__ import annotations

from datetime import date, datetime, timezone
from typing import Any

from fastapi import HTTPException, status
from supabase import Client

# Monthly match views per canonical tier (99999 = unlimited).
TIER_MATCH_LIMITS: dict[str, int] = {
    "mwana": 5,
    "mwizi": 25,
    "wino": 99999,
}

TIER_ALIASES: dict[str, str] = {
    "mwana": "mwana",
    "free": "mwana",
    "mwizi": "mwizi",
    "mwezi": "mwizi",
    "starter": "mwizi",
    "wino": "wino",
    "bwino": "wino",
    "professional": "wino",
    "super_standard": "wino",
}

TIER_DISPLAY: dict[str, str] = {
    "mwana": "Mwana",
    "mwizi": "Mwizi",
    "wino": "Wino",
}

UNLIMITED_MATCHES = 99999

FEATURE_COVER_LETTER = "cover_letter"
FEATURE_JOB_MATCHES = "job_matches"


def normalize_tier(raw: str | None) -> str:
    """Map stored subscription_tier to canonical mwana | mwizi | wino."""
    key = (raw or "mwana").strip().lower()
    return TIER_ALIASES.get(key, "mwana")


def match_limit_for_tier(tier: str) -> int:
    return TIER_MATCH_LIMITS.get(normalize_tier(tier), TIER_MATCH_LIMITS["mwana"])


def _first_of_next_month(today: date) -> date:
    if today.month == 12:
        return date(today.year + 1, 1, 1)
    return date(today.year, today.month + 1, 1)


def _parse_reset_date(value: Any) -> date | None:
    if value is None:
        return None
    if isinstance(value, date) and not isinstance(value, datetime):
        return value
    if isinstance(value, str):
        try:
            return date.fromisoformat(value[:10])
        except ValueError:
            return None
    return None


def _first_row(data: Any) -> dict[str, Any] | None:
    if isinstance(data, list):
        return data[0] if data else None
    return data if isinstance(data, dict) else None


async def load_user_gating_row(user_id: str, supabase: Client) -> dict[str, Any]:
    result = (
        supabase.table("users")
        .select(
            "id, subscription_tier, matches_viewed_this_month, billing_cycle_reset, role"
        )
        .eq("id", user_id)
        .limit(1)
        .execute()
    )
    row = _first_row(result.data)
    if not row:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    return row


async def ensure_billing_cycle_current(
    user_id: str, row: dict[str, Any], supabase: Client, *, today: date | None = None
) -> dict[str, Any]:
    """Reset matches_viewed_this_month when billing_cycle_reset has passed."""
    current_day = today or datetime.now(timezone.utc).date()
    reset_on = _parse_reset_date(row.get("billing_cycle_reset"))
    viewed = int(row.get("matches_viewed_this_month") or 0)

    if reset_on is None or current_day >= reset_on:
        next_reset = _first_of_next_month(current_day)
        supabase.table("users").update(
            {
                "matches_viewed_this_month": 0,
                "billing_cycle_reset": next_reset.isoformat(),
            }
        ).eq("id", user_id).execute()
        row = {**row, "matches_viewed_this_month": 0, "billing_cycle_reset": next_reset.isoformat()}
    return row


async def increment_matches_viewed(
    user_id: str, supabase: Client, *, count: int = 1
) -> int:
    """Add count to matches_viewed_this_month; returns new total."""
    if count <= 0:
        row = await load_user_gating_row(user_id, supabase)
        return int(row.get("matches_viewed_this_month") or 0)

    row = await load_user_gating_row(user_id, supabase)
    row = await ensure_billing_cycle_current(user_id, row, supabase)
    new_total = int(row.get("matches_viewed_this_month") or 0) + count
    supabase.table("users").update({"matches_viewed_this_month": new_total}).eq(
        "id", user_id
    ).execute()
    return new_total


def _cover_letter_allowed(canonical: str) -> bool:
    return canonical == "wino"


def _job_matches_allowed(canonical: str, viewed: int) -> bool:
    limit = match_limit_for_tier(canonical)
    if limit >= UNLIMITED_MATCHES:
        return True
    return viewed < limit


async def verify_tier_access(
    required_feature: str,
    user_id: str,
    supabase: Client,
    *,
    increment_match_views: int = 0,
    is_superadmin: bool = False,
) -> str:
    """Enforce tier gates. Returns canonical tier when allowed.

    required_feature: 'cover_letter' | 'job_matches'
    increment_match_views: add to monthly counter after a successful match fetch.
    """
    if is_superadmin:
        return "wino"

    row = await load_user_gating_row(user_id, supabase)
    row = await ensure_billing_cycle_current(user_id, row, supabase)
    canonical = normalize_tier(row.get("subscription_tier"))
    viewed = int(row.get("matches_viewed_this_month") or 0)

    if required_feature == FEATURE_COVER_LETTER:
        if not _cover_letter_allowed(canonical):
            detail = (
                "Upgrade to Mwizi or Wino to generate cover letters."
                if canonical == "mwana"
                else "Upgrade to Wino to generate cover letters."
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=detail,
            )
    elif required_feature == FEATURE_JOB_MATCHES:
        if not _job_matches_allowed(canonical, viewed):
            limit = match_limit_for_tier(canonical)
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"Monthly match limit reached ({limit} on "
                    f"{TIER_DISPLAY.get(canonical, canonical)}). "
                    "Upgrade to Mwizi or Wino for more matches."
                ),
            )
        if increment_match_views > 0:
            new_viewed = viewed + increment_match_views
            limit = match_limit_for_tier(canonical)
            if limit < UNLIMITED_MATCHES and new_viewed > limit:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=(
                        f"Monthly match limit reached ({limit} on "
                        f"{TIER_DISPLAY.get(canonical, canonical)})."
                    ),
                )
            await increment_matches_viewed(
                user_id, supabase, count=increment_match_views
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown tier feature: {required_feature}",
        )

    return canonical
