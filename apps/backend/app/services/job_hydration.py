"""Normalize raw PostgREST `jobs` rows (with optional `job_skills` embed) into Job."""

from app.schemas.jobs import Job


def hydrate_job_row(j: dict) -> Job:
    row = dict(j)
    skill_rows = row.pop("job_skills", None) or []
    skills: list[str] = []
    for s in skill_rows:
        if isinstance(s, dict) and s.get("skills") and isinstance(s["skills"], dict):
            name = s["skills"].get("name")
            if isinstance(name, str) and name:
                skills.append(name)
    row["skills_required"] = skills
    row["skills"] = skills
    return Job(**row)
