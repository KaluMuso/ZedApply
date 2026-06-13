from fastapi import APIRouter, Depends
from pydantic import BaseModel
from supabase import Client
from typing import Any

from app.core.deps import get_supabase, require_admin
from app.services.target_scraper import trigger_scrape_targets, fetch_and_extract_jobs

router = APIRouter()

@router.get("/list", response_model=list[dict[str, Any]])
async def list_targets(
    supabase: Client = Depends(get_supabase),
    _=Depends(require_admin),
):
    res = supabase.table("scrape_targets").select("*").order("created_at", desc=True).execute()
    return res.data

class AddTargetRequest(BaseModel):
    company_name: str
    url: str
    cron_interval_hours: int

@router.post("/add", response_model=dict[str, Any])
async def add_target(
    req: AddTargetRequest,
    supabase: Client = Depends(get_supabase),
    _=Depends(require_admin),
):
    res = supabase.table("scrape_targets").insert({
        "company_name": req.company_name,
        "url": req.url,
        "cron_interval_hours": req.cron_interval_hours,
    }).execute()
    return res.data[0] if res.data else {}

class ToggleTargetRequest(BaseModel):
    id: str
    is_active: bool

@router.patch("/toggle", response_model=dict[str, Any])
async def toggle_target(
    req: ToggleTargetRequest,
    supabase: Client = Depends(get_supabase),
    _=Depends(require_admin),
):
    res = supabase.table("scrape_targets").update({"is_active": req.is_active}).eq("id", req.id).execute()
    return res.data[0] if res.data else {}

class DeleteTargetRequest(BaseModel):
    id: str

@router.delete("/delete", response_model=dict[str, Any])
async def delete_target(
    req: DeleteTargetRequest,
    supabase: Client = Depends(get_supabase),
    _=Depends(require_admin),
):
    supabase.table("scrape_targets").delete().eq("id", req.id).execute()
    return {"success": True}

@router.post("/trigger", response_model=dict[str, Any])
async def trigger_scrape(
    supabase: Client = Depends(get_supabase),
    _=Depends(require_admin),
):
    """Trigger the dynamic scrape targets that are past their cron interval."""
    return await trigger_scrape_targets(supabase)


class ForceScrapeRequest(BaseModel):
    id: str

@router.post("/force", response_model=dict[str, Any])
async def force_scrape_target(
    req: ForceScrapeRequest,
    supabase: Client = Depends(get_supabase),
    _=Depends(require_admin),
):
    """Force an immediate scrape for a specific target, regardless of interval."""
    target_res = supabase.table("scrape_targets").select("*").eq("id", req.id).execute()
    if not target_res.data:
        return {"error": "Target not found"}
        
    target = target_res.data[0]
    company_name = target["company_name"]
    url = target["url"]

    jobs = await fetch_and_extract_jobs(company_name, url)
    
    new_inserted = 0
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    
    for job in jobs:
        title = job.get("title", "").strip()
        apply_url = job.get("apply_url", "").strip()
        location = job.get("location", "").strip()
        
        if not title or not apply_url:
            continue

        if apply_url.startswith("/"):
            from urllib.parse import urlparse
            parsed_base = urlparse(url)
            base = f"{parsed_base.scheme}://{parsed_base.netloc}"
            apply_url = f"{base}{apply_url}"

        dup_url = supabase.table("jobs").select("id").eq("source_url", apply_url).execute()
        if dup_url.data:
            continue
            
        dup_title = supabase.table("jobs").select("id").eq("title", title).eq("company", company_name).execute()
        if dup_title.data:
            continue

        supabase.table("jobs").insert({
            "title": title,
            "company": company_name,
            "location": location,
            "source_url": apply_url,
            "is_review_required": True,
            "is_active": False,
        }).execute()
        new_inserted += 1

    supabase.table("scrape_targets").update({"last_scraped_at": now.isoformat()}).eq("id", req.id).execute()
    
    return {
        "company_name": company_name,
        "jobs_found": len(jobs),
        "new_inserted": new_inserted
    }
