"""Public tier catalog + superadmin tier_config editor."""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from app.core.deps import get_supabase, require_superadmin
from app.schemas.tier_config import (
    TierConfigBulkUpdate,
    TierConfigList,
    TierConfigRow,
    VALID_TIERS,
)
from app.services.tier_config import (
    clear_tier_config_cache,
    fetch_tier_config_rows,
)

public_router = APIRouter(prefix="/tiers", tags=["Pricing"])

admin_router = APIRouter(
    prefix="/admin/tier-config",
    tags=["Admin"],
    dependencies=[Depends(require_superadmin)],
)


def _rows_to_response(rows: list[dict]) -> TierConfigList:
    return TierConfigList(
        tiers=[
            TierConfigRow(
                tier=r["tier"],
                display_name=r["display_name"],
                price_ngwee=int(r["price_ngwee"]),
                matches_limit=int(r["matches_limit"]),
                sort_order=int(r.get("sort_order") or 0),
                updated_at=r.get("updated_at"),
            )
            for r in rows
        ]
    )


@public_router.get("", response_model=TierConfigList)
async def list_public_tiers(supabase=Depends(get_supabase)):
    """Public pricing catalog for the marketing/pricing pages."""
    rows = await fetch_tier_config_rows(supabase)
    return _rows_to_response(rows)


@admin_router.get("", response_model=TierConfigList)
async def get_admin_tier_config(supabase=Depends(get_supabase)):
    """Superadmin: read current tier pricing and match quotas."""
    rows = await fetch_tier_config_rows(supabase, force=True)
    return _rows_to_response(rows)


@admin_router.put("", response_model=TierConfigList)
async def update_admin_tier_config(
    body: TierConfigBulkUpdate,
    current_user: dict = Depends(require_superadmin),
    supabase=Depends(get_supabase),
):
    """Superadmin: replace tier pricing and match quotas."""
    seen: set[str] = set()
    now = datetime.now(timezone.utc).isoformat()
    user_id = current_user["id"]

    for item in body.tiers:
        if item.tier not in VALID_TIERS:
            raise HTTPException(status_code=422, detail=f"Invalid tier: {item.tier}")
        if item.tier in seen:
            raise HTTPException(status_code=422, detail=f"Duplicate tier: {item.tier}")
        seen.add(item.tier)
        if item.tier == "free" and item.price_ngwee != 0:
            raise HTTPException(
                status_code=422,
                detail="Free tier price must be K0 (price_ngwee=0).",
            )

    if seen != VALID_TIERS:
        raise HTTPException(
            status_code=422,
            detail="Request must include all four tiers: free, starter, professional, super_standard.",
        )

    order = {"free": 0, "starter": 1, "professional": 2, "super_standard": 3}
    for item in sorted(body.tiers, key=lambda t: order[t.tier]):
        supabase.table("tier_config").upsert(
            {
                "tier": item.tier,
                "display_name": item.display_name.strip(),
                "price_ngwee": item.price_ngwee,
                "matches_limit": item.matches_limit,
                "sort_order": order[item.tier],
                "updated_at": now,
                "updated_by": user_id,
            },
            on_conflict="tier",
        ).execute()

    clear_tier_config_cache()
    rows = await fetch_tier_config_rows(supabase, force=True)
    return _rows_to_response(rows)
