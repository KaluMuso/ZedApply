"""Admin routes — superadmin only.

All endpoints require role = 'superadmin'. The frontend's AdminGuard
mirrors this check, but the API enforces it as the source of truth.
"""
import math
from fastapi import APIRouter, Depends, HTTPException, Query
from app.core.deps import get_supabase, require_admin
from app.schemas.admin import (
    AdminStats,
    AdminUserRow,
    AdminUserList,
    AdminJobRow,
    AdminJobList,
    BulkDeactivateRequest,
    BulkDeactivateResponse,
    AdminPaymentRow,
    AdminPaymentList,
)

router = APIRouter(prefix="/admin", tags=["Admin"], dependencies=[Depends(require_admin)])


@router.get("/stats", response_model=AdminStats)
async def get_stats(supabase=Depends(get_supabase)):
    """Aggregate counters for the admin dashboard."""
    rpc_res = supabase.rpc("admin_stats").execute()
    data = rpc_res.data or {}
    if isinstance(data, list):
        # supabase-py returns list of one row for SETOF; handle either shape
        data = data[0] if data else {}
    return AdminStats(**(data or {}))


@router.get("/users", response_model=AdminUserList)
async def list_users(
    page: int = Query(1, ge=1),
    per_page: int = Query(25, ge=1, le=100),
    search: str | None = Query(None, description="Match against phone, full_name, email"),
    tier: str | None = Query(None, description="Filter by subscription_tier"),
    supabase=Depends(get_supabase),
):
    query = supabase.table("users").select(
        "id, phone, full_name, location, subscription_tier, role, created_at",
        count="exact",
    ).order("created_at", desc=True)
    if tier:
        query = query.eq("subscription_tier", tier)
    if search:
        query = query.or_(
            f"phone.ilike.%{search}%,full_name.ilike.%{search}%,email.ilike.%{search}%"
        )
    offset = (page - 1) * per_page
    result = query.range(offset, offset + per_page - 1).execute()
    total = result.count or 0
    pages = math.ceil(total / per_page) if total > 0 else 1

    user_ids = [u["id"] for u in (result.data or [])]
    sub_map: dict[str, dict] = {}
    if user_ids:
        subs = (
            supabase.table("subscriptions")
            .select("user_id, matches_used, matches_limit")
            .in_("user_id", user_ids)
            .execute()
        )
        for s in subs.data or []:
            sub_map[s["user_id"]] = s

    rows = []
    for u in result.data or []:
        sub = sub_map.get(u["id"], {})
        rows.append(
            AdminUserRow(
                id=u["id"],
                phone=u["phone"],
                full_name=u.get("full_name"),
                location=u.get("location"),
                subscription_tier=u.get("subscription_tier") or "free",
                role=u.get("role") or "user",
                matches_used=sub.get("matches_used", 0),
                matches_limit=sub.get("matches_limit", 0),
                created_at=u.get("created_at"),
            )
        )
    return AdminUserList(users=rows, total=total, page=page, per_page=per_page, pages=pages)


@router.get("/jobs", response_model=AdminJobList)
async def list_jobs(
    page: int = Query(1, ge=1),
    per_page: int = Query(25, ge=1, le=100),
    expired: bool | None = Query(None, description="true = past closing_date and still active"),
    is_active: bool | None = Query(None),
    supabase=Depends(get_supabase),
):
    query = supabase.table("jobs").select(
        "id, title, company, location, source, quality_score, is_active, closing_date, posted_at",
        count="exact",
    ).order("posted_at", desc=True)
    if is_active is not None:
        query = query.eq("is_active", is_active)
    if expired is True:
        # Postgres: closing_date < today AND is_active = true
        from datetime import date
        query = query.lt("closing_date", date.today().isoformat()).eq("is_active", True)
    elif expired is False:
        from datetime import date
        query = query.gte("closing_date", date.today().isoformat())

    offset = (page - 1) * per_page
    result = query.range(offset, offset + per_page - 1).execute()
    total = result.count or 0
    pages = math.ceil(total / per_page) if total > 0 else 1

    rows = [
        AdminJobRow(
            id=j["id"],
            title=j["title"],
            company=j.get("company"),
            location=j.get("location"),
            source=j["source"],
            quality_score=j.get("quality_score") or 0,
            is_active=j.get("is_active", True),
            closing_date=j.get("closing_date"),
            posted_at=j.get("posted_at"),
        )
        for j in (result.data or [])
    ]
    return AdminJobList(jobs=rows, total=total, page=page, per_page=per_page, pages=pages)


@router.post("/jobs/bulk-deactivate", response_model=BulkDeactivateResponse)
async def bulk_deactivate(body: BulkDeactivateRequest, supabase=Depends(get_supabase)):
    """Deactivate jobs by ID, or all expired jobs if expired_only=true.

    Uses the existing `deactivate_expired_jobs()` RPC for the expired_only path
    so the row count stays consistent with the WhatsApp/n8n cleanup workflow.
    """
    if body.expired_only:
        rpc_res = supabase.rpc("deactivate_expired_jobs").execute()
        count = rpc_res.data if isinstance(rpc_res.data, int) else (rpc_res.data or 0)
        return BulkDeactivateResponse(deactivated=int(count))

    if not body.job_ids:
        raise HTTPException(status_code=422, detail="Provide job_ids or set expired_only=true")

    res = (
        supabase.table("jobs")
        .update({"is_active": False})
        .in_("id", body.job_ids)
        .execute()
    )
    return BulkDeactivateResponse(deactivated=len(res.data or []))


@router.get("/payments", response_model=AdminPaymentList)
async def list_payments(
    page: int = Query(1, ge=1),
    per_page: int = Query(25, ge=1, le=100),
    status_filter: str | None = Query(None, alias="status"),
    supabase=Depends(get_supabase),
):
    query = supabase.table("payments").select(
        "id, user_id, amount, currency, payment_method, provider, status, created_at, completed_at",
        count="exact",
    ).order("created_at", desc=True)
    if status_filter:
        query = query.eq("status", status_filter)

    offset = (page - 1) * per_page
    result = query.range(offset, offset + per_page - 1).execute()
    total = result.count or 0
    pages = math.ceil(total / per_page) if total > 0 else 1

    user_ids = list({p["user_id"] for p in (result.data or [])})
    phone_map: dict[str, str] = {}
    if user_ids:
        users = supabase.table("users").select("id, phone").in_("id", user_ids).execute()
        phone_map = {u["id"]: u["phone"] for u in (users.data or [])}

    rows = [
        AdminPaymentRow(
            id=p["id"],
            user_id=p["user_id"],
            user_phone=phone_map.get(p["user_id"]),
            amount=p["amount"],
            currency=p.get("currency", "ZMW"),
            payment_method=p["payment_method"],
            provider=p.get("provider"),
            status=p["status"],
            created_at=p.get("created_at"),
            completed_at=p.get("completed_at"),
        )
        for p in (result.data or [])
    ]

    completed_total_res = (
        supabase.table("payments")
        .select("amount")
        .eq("status", "completed")
        .execute()
    )
    total_completed = sum((p.get("amount") or 0) for p in (completed_total_res.data or []))

    return AdminPaymentList(
        payments=rows,
        total=total,
        page=page,
        per_page=per_page,
        pages=pages,
        total_completed_ngwee=total_completed,
    )


@router.patch("/users/{user_id}/role")
async def update_user_role(
    user_id: str,
    body: dict,
    supabase=Depends(get_supabase),
):
    role = body.get("role")
    if role not in {"user", "admin", "superadmin"}:
        raise HTTPException(status_code=422, detail="role must be one of: user, admin, superadmin")
    res = supabase.table("users").update({"role": role}).eq("id", user_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="User not found")
    return {"id": user_id, "role": role}


@router.post("/jobs")
async def create_admin_job(body: dict, supabase=Depends(get_supabase)):
    required = {"title", "description", "source"}
    missing = [k for k in required if not body.get(k)]
    if missing:
        raise HTTPException(status_code=422, detail=f"Missing required fields: {', '.join(missing)}")
    res = supabase.table("jobs").insert(body).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="Failed to create job")
    return res.data[0]


@router.patch("/jobs/{job_id}")
async def update_admin_job(job_id: str, body: dict, supabase=Depends(get_supabase)):
    if not body:
        raise HTTPException(status_code=422, detail="No fields to update")
    res = supabase.table("jobs").update(body).eq("id", job_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Job not found")
    return res.data[0]


@router.delete("/jobs/{job_id}")
async def delete_admin_job(job_id: str, supabase=Depends(get_supabase)):
    res = supabase.table("jobs").delete().eq("id", job_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Job not found")
    return {"deleted": True, "id": job_id}
