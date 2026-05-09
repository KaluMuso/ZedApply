"""Job listing routes."""
import hashlib
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from app.core.deps import get_supabase, require_admin
from app.core.rate_limit import limiter
from app.schemas.jobs import Job, JobCreate, JobList
from app.services.embedding import generate_embedding

router = APIRouter(prefix="/jobs", tags=["Jobs"])


@router.get("", response_model=JobList)
async def list_jobs(
    page: int = Query(1, ge=1), per_page: int = Query(20, ge=1, le=50),
    location: str | None = None, search: str | None = None,
    supabase=Depends(get_supabase),
):
    query = supabase.table("jobs").select("*, job_skills(skills(name))", count="exact").eq("is_active", True).order("posted_at", desc=True)
    if location:
        query = query.ilike("location", f"%{location}%")
    if search:
        query = query.or_(f"title.ilike.%{search}%,company.ilike.%{search}%,description.ilike.%{search}%")
    offset = (page - 1) * per_page
    result = query.range(offset, offset + per_page - 1).execute()
    total = result.count or 0
    import math
    pages = math.ceil(total / per_page) if total > 0 else 1
    jobs = []
    for j in (result.data or []):
        skill_rows = j.pop("job_skills", [])
        skills = [s["skills"]["name"] for s in skill_rows if s.get("skills")]
        j["skills_required"] = skills
        j["skills"] = skills
        jobs.append(Job(**j))
    return JobList(jobs=jobs, total=total, page=page, per_page=per_page, pages=pages)


@router.get("/{job_id}", response_model=Job)
async def get_job(job_id: str, supabase=Depends(get_supabase)):
    result = supabase.table("jobs").select("*, job_skills(skills(name))").eq("id", job_id).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Job not found")
    j = result.data
    skill_rows = j.pop("job_skills", [])
    skills = [s["skills"]["name"] for s in skill_rows if s.get("skills")]
    j["skills_required"] = skills
    j["skills"] = skills
    return Job(**j)


@router.post("", response_model=Job, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
async def create_job(request: Request, body: JobCreate, current_user: dict = Depends(require_admin), supabase=Depends(get_supabase)):
    fingerprint = hashlib.sha256(f"{body.title}|{body.company or ''}|{body.description[:200]}".lower().encode()).hexdigest()
    existing = supabase.table("job_fingerprints").select("job_id").eq("fingerprint", fingerprint).execute()
    if existing.data:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Duplicate job listing")

    try:
        embedding = await generate_embedding(f"{body.title} {body.company or ''} {body.description}")
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))
    job_data = body.model_dump(exclude_none=True)
    skills_required = job_data.pop("skills_required", [])
    job_data["embedding"] = embedding
    result = supabase.table("jobs").insert(job_data).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create job")
    job = result.data[0]

    supabase.table("job_fingerprints").insert({"fingerprint": fingerprint, "job_id": job["id"]}).execute()

    for skill_name in skills_required:
        skill_result = supabase.table("skills").select("id").eq("name", skill_name.lower()).limit(1).execute()
        if skill_result.data:
            supabase.table("job_skills").insert({"job_id": job["id"], "skill_id": skill_result.data[0]["id"]}).execute()
        else:
            alias_result = supabase.table("skill_aliases").select("skill_id").eq("alias", skill_name.lower()).limit(1).execute()
            if alias_result.data:
                supabase.table("job_skills").insert({"job_id": job["id"], "skill_id": alias_result.data[0]["skill_id"]}).execute()

    return Job(**job)
