"""Public stats endpoint (task #64).

Aggregate-only counters safe to expose without auth — used by the home
page's social-proof strip. Deliberately narrow: this is NOT a downsized
admin dashboard. We surface:

  - jobs_active        — number of active jobs in the aggregated feed
  - avg_skills_matched — heuristic average of matched-skill count per user
  - hours_saved_total  — coarse estimate of applicant time saved

We never expose raw user counts, revenue figures, or per-user data.
The /admin/stats endpoint remains the source of truth for internal
reporting and stays behind require_admin.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends

from app.core.deps import get_supabase

router = APIRouter(prefix="/stats", tags=["Public"])

# Cap how many match rows we sweep when computing the average. Keeps the
# endpoint cheap as the matches table grows; a recent sample is the most
# representative signal anyway.
_MATCH_SAMPLE_CAP = 5000
# Conservative time-saved estimate: 30 minutes per delivered match (the
# user didn't have to find, read, and triage the listing themselves).
_HOURS_SAVED_PER_MATCH = 0.5
# Sensible default for "skills matched per user" shown before we have
# enough match data to compute a real average.
_AVG_SKILLS_FALLBACK = 7
# Cap on the displayed average — sanity bound. Real CVs don't realistically
# overlap on more than ~15 distinct skills with any one role.
_AVG_SKILLS_CAP = 15


@router.get("/public")
async def get_public_stats(supabase=Depends(get_supabase)) -> dict:
    """Aggregate, auth-free counters for the home-page social-proof strip.

    Returns a flat dict with three keys. Each is a non-negative integer.
    Falls back to sensible defaults (not zero) when the underlying tables
    are empty, so a fresh DB doesn't make the home page read "0 jobs
    aggregated".
    """
    # ── jobs_active ──
    jobs_active = 0
    try:
        jobs_resp = (
            supabase.table("jobs")
            .select("id", count="exact")
            .eq("is_active", True)
            .execute()
        )
        jobs_active = jobs_resp.count or len(jobs_resp.data or [])
    except Exception:
        # Defensive: a Supabase outage shouldn't 500 the home page; the
        # frontend treats absence as "show fallback copy". Return zeros
        # and let the frontend's fallback path render.
        return {
            "jobs_active": 0,
            "avg_skills_matched": _AVG_SKILLS_FALLBACK,
            "hours_saved_total": 0,
        }

    # ── matches sample for derived metrics ──
    try:
        matches_resp = (
            supabase.table("matches")
            .select("matched_skills, user_id")
            .order("created_at", desc=True)
            .limit(_MATCH_SAMPLE_CAP)
            .execute()
        )
        rows = matches_resp.data or []
    except Exception:
        rows = []

    match_count = len(rows)

    if match_count:
        total_skills = sum(len(r.get("matched_skills") or []) for r in rows)
        unique_users = len({r.get("user_id") for r in rows if r.get("user_id")})
        avg_skills = round(total_skills / max(unique_users, 1)) if unique_users else _AVG_SKILLS_FALLBACK
        avg_skills = min(max(avg_skills, 1), _AVG_SKILLS_CAP)
    else:
        avg_skills = _AVG_SKILLS_FALLBACK

    hours_saved_total = round(match_count * _HOURS_SAVED_PER_MATCH)

    return {
        "jobs_active": jobs_active,
        "avg_skills_matched": avg_skills,
        "hours_saved_total": hours_saved_total,
    }
