"""Matching routes."""
from fastapi import APIRouter, Depends, HTTPException, Query, Request, BackgroundTasks
from app.core.deps import get_supabase, get_current_user_id, get_current_user, is_superadmin
from app.core.rate_limit import limiter
from app.schemas.matching import MatchResult, MatchList
from app.schemas.jobs import Job
from app.services.matching import run_matching_for_user, store_matches, check_match_quota

router = APIRouter(prefix="/matches", tags=["Matching"])


@router.get("", response_model=MatchList)
async def get_matches(
    min_score: float = Query(50, ge=0, le=100), limit: int = Query(10, ge=1, le=50),
    user_id: str = Depends(get_current_user_id), supabase=Depends(get_supabase),
):
    has_quota, remaining = await check_match_quota(user_id, supabase)
    result = (
        supabase.table("matches").select("*, jobs(*)").eq("user_id", user_id)
        .gte("score", min_score).order("score", desc=True).limit(limit).execute()
    )
    matches = []
    for m in result.data or []:
        job_data = m.pop("jobs", {})
        matches.append(MatchResult(
            id=m["id"], job=Job(**job_data), score=m["score"],
            vector_score=m["vector_score"], skill_score=m["skill_score"], bonus_score=m["bonus_score"],
            matched_skills=m.get("matched_skills", []), missing_skills=m.get("missing_skills", []),
            explanation=m.get("explanation"), created_at=m["created_at"],
        ))
    return MatchList(matches=matches, remaining_quota=remaining)


@router.post("/trigger")
@limiter.limit("3/minute")
async def trigger_matching(
    request: Request,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
    supabase=Depends(get_supabase),
):
    user_id = current_user["id"]

    # Superadmin bypasses quota check
    if not is_superadmin(current_user):
        has_quota, remaining = await check_match_quota(user_id, supabase)
        if not has_quota:
            raise HTTPException(status_code=403, detail="Monthly match quota exceeded. Upgrade your plan.")

    cv_result = supabase.table("cvs").select("id").eq("user_id", user_id).eq("is_primary", True).limit(1).execute()
    if not cv_result.data:
        raise HTTPException(status_code=422, detail="Upload a CV first before matching")

    background_tasks.add_task(_run_matching_task, user_id, cv_result.data[0]["id"], supabase)
    return {"message": "Matching started. Results will be available shortly.", "estimated_seconds": 15}


async def _run_matching_task(user_id: str, cv_id: str, supabase):
    matches = await run_matching_for_user(user_id, supabase)
    await store_matches(user_id, cv_id, matches, supabase)
    sub = supabase.table("subscriptions").select("matches_used").eq("user_id", user_id).single().execute()
    if sub.data:
        supabase.table("subscriptions").update({"matches_used": sub.data["matches_used"] + 1}).eq("user_id", user_id).execute()
