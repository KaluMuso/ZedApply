"""Anonymized candidate search for employers."""
from __future__ import annotations

import re
from typing import Any

from supabase import Client

from app.schemas.employer import CandidatePreview


def _first_rows(data: Any) -> list[dict[str, Any]]:
    if isinstance(data, list):
        return [r for r in data if isinstance(r, dict)]
    if isinstance(data, dict):
        return [data]
    return []


def _headline_from_parsed(parsed: dict[str, Any] | None) -> str | None:
    if not parsed:
        return None
    for key in ("headline", "summary", "professional_summary"):
        val = parsed.get(key)
        if isinstance(val, str) and val.strip():
            return val.strip()[:160]
    roles = parsed.get("experience") or parsed.get("work_experience")
    if isinstance(roles, list) and roles:
        first = roles[0]
        if isinstance(first, dict):
            title = first.get("title") or first.get("role")
            if title:
                return str(title)[:160]
    return None


def _skills_match(user_skills: list[str], query_skills: list[str]) -> bool:
    if not query_skills:
        return True
    normalized = {s.lower() for s in user_skills}
    return any(q.lower() in normalized or any(q.lower() in s for s in normalized) for q in query_skills)


async def search_candidates(
    supabase: Client,
    *,
    skills: str | None,
    location: str | None,
    limit: int = 20,
) -> tuple[list[CandidatePreview], int]:
    """Return anonymized previews for opt-in candidates."""
    skill_terms = [t.strip() for t in (skills or "").split(",") if t.strip()]
    loc_term = (location or "").strip().lower()

    users_res = (
        supabase.table("users")
        .select(
            "id, location, years_experience, full_name, profile_visible_to_employers"
        )
        .eq("profile_visible_to_employers", True)
        .eq("is_active", True)
        .limit(200)
        .execute()
    )
    rows = _first_rows(users_res.data)
    previews: list[CandidatePreview] = []

    for row in rows:
        uid = row["id"]
        user_loc = (row.get("location") or "").lower()
        if loc_term and loc_term not in user_loc:
            continue

        cv_res = (
            supabase.table("cvs")
            .select("id, parsed_data, is_primary")
            .eq("user_id", uid)
            .eq("is_primary", True)
            .limit(1)
            .execute()
        )
        cv = _first_rows(cv_res.data)
        cv_row = cv[0] if cv else {}
        parsed = cv_row.get("parsed_data") if isinstance(cv_row.get("parsed_data"), dict) else {}

        skill_names: list[str] = []
        us_res = (
            supabase.table("user_skills")
            .select("skills(name)")
            .eq("user_id", uid)
            .limit(30)
            .execute()
        )
        for us in _first_rows(us_res.data):
            sk = us.get("skills")
            if isinstance(sk, dict) and sk.get("name"):
                skill_names.append(str(sk["name"]))
            elif isinstance(sk, list) and sk:
                for item in sk:
                    if isinstance(item, dict) and item.get("name"):
                        skill_names.append(str(item["name"]))

        if parsed.get("skills") and isinstance(parsed["skills"], list):
            for s in parsed["skills"][:15]:
                if isinstance(s, str):
                    skill_names.append(s)
                elif isinstance(s, dict) and s.get("name"):
                    skill_names.append(str(s["name"]))

        skill_names = list(dict.fromkeys(skill_names))[:12]
        if skill_terms and not _skills_match(skill_names, skill_terms):
            text_blob = " ".join(skill_names).lower()
            if not any(re.search(rf"\b{re.escape(t.lower())}\b", text_blob) for t in skill_terms):
                headline = _headline_from_parsed(parsed) or ""
                if not any(t.lower() in headline.lower() for t in skill_terms):
                    continue

        hint = None
        if skill_terms:
            matched = [s for s in skill_names if any(t.lower() in s.lower() for t in skill_terms)]
            if matched:
                hint = f"Skills: {', '.join(matched[:4])}"

        previews.append(
            CandidatePreview(
                candidate_id=uid,
                headline=_headline_from_parsed(parsed),
                location=row.get("location"),
                years_experience=row.get("years_experience"),
                skills=skill_names,
                match_hint=hint,
            )
        )

    total = len(previews)
    return previews[:limit], total
