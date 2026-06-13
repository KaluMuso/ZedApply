import json
import logging
from datetime import datetime, timezone
from typing import Any

import httpx
from supabase import Client

from app.services.gemini_direct import generate_json

logger = logging.getLogger(__name__)

SCRAPE_PROMPT = """You are an expert at extracting job postings from careers pages.
Below is the raw text content of a careers page for the company: {company_name}.

Extract all currently open job postings from this text.
Return a JSON object with a single key "jobs" which is a list of objects.
Each object must have:
- "title": The title of the job.
- "apply_url": The specific URL or relative path to apply or read more about the job.
- "location": The location of the job, or an empty string if not found.

Raw Page Content:
-------------------
{text_content}
"""

JOB_LIST_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "jobs": {
            "type": "ARRAY",
            "items": {
                "type": "OBJECT",
                "properties": {
                    "title": {"type": "STRING"},
                    "apply_url": {"type": "STRING"},
                    "location": {"type": "STRING"},
                },
                "required": ["title", "apply_url", "location"],
            },
        }
    },
    "required": ["jobs"],
}

async def fetch_and_extract_jobs(company_name: str, url: str) -> list[dict[str, str]]:
    # 1. Try standard HTTP fetch first
    html_text = ""
    try:
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            html_text = resp.text
    except Exception as exc:
        logger.warning("Failed to fetch target URL %s: %s", url, exc)

    jobs = []
    if html_text:
        try:
            result = await generate_json(
                SCRAPE_PROMPT.format(company_name=company_name, text_content=html_text[:100000]),
                schema=JOB_LIST_SCHEMA,
                max_tokens=8192,
                feature="target_scraper",
            )
            jobs = result.get("jobs", [])
        except Exception as exc:
            logger.warning("Failed to extract jobs via Gemini for %s: %s", url, exc)

    if jobs:
        return jobs

    # 2. Fallback to Jina Reader (JS rendered)
    logger.info("Standard fetch yielded 0 jobs for %s, falling back to JS render via Jina.", url)
    jina_url = f"https://r.jina.ai/{url}"
    try:
        async with httpx.AsyncClient(timeout=60.0, follow_redirects=True) as client:
            resp = await client.get(jina_url)
            resp.raise_for_status()
            jina_text = resp.text
            
            result = await generate_json(
                SCRAPE_PROMPT.format(company_name=company_name, text_content=jina_text[:100000]),
                schema=JOB_LIST_SCHEMA,
                max_tokens=8192,
                feature="target_scraper_jina",
            )
            return result.get("jobs", [])
    except Exception as exc:
        logger.warning("Jina fallback failed for %s: %s", url, exc)
        return []


async def trigger_scrape_targets(supabase: Client) -> dict[str, Any]:
    """Finds all due targets, fetches jobs, deduplicates, and queues for review."""
    now = datetime.now(timezone.utc)
    
    # 1. Fetch due targets
    res = supabase.table("scrape_targets").select("*").eq("is_active", True).execute()
    targets = res.data or []
    
    due_targets = []
    for t in targets:
        last_scraped_str = t.get("last_scraped_at")
        cron_hours = t.get("cron_interval_hours", 72)
        if not last_scraped_str:
            due_targets.append(t)
            continue
        
        last_scraped = datetime.fromisoformat(last_scraped_str.replace("Z", "+00:00"))
        if (now - last_scraped).total_seconds() >= cron_hours * 3600:
            due_targets.append(t)

    results = []
    for target in due_targets:
        target_id = target["id"]
        company_name = target["company_name"]
        url = target["url"]

        jobs = await fetch_and_extract_jobs(company_name, url)
        
        new_inserted = 0
        for job in jobs:
            title = job.get("title", "").strip()
            apply_url = job.get("apply_url", "").strip()
            location = job.get("location", "").strip()
            
            if not title or not apply_url:
                continue

            # Basic absolute URL resolution
            if apply_url.startswith("/"):
                from urllib.parse import urlparse
                parsed_base = urlparse(url)
                base = f"{parsed_base.scheme}://{parsed_base.netloc}"
                apply_url = f"{base}{apply_url}"

            # Check if duplicate
            # 1. Same source_url
            dup_url = supabase.table("jobs").select("id").eq("source_url", apply_url).execute()
            if dup_url.data:
                continue
                
            # 2. Same title and company
            dup_title = supabase.table("jobs").select("id").eq("title", title).eq("company", company_name).execute()
            if dup_title.data:
                continue

            # Insert as review_required
            supabase.table("jobs").insert({
                "title": title,
                "company": company_name,
                "location": location,
                "source_url": apply_url,
                "is_review_required": True,
                "is_active": False,
            }).execute()
            new_inserted += 1

        # Update last_scraped_at
        supabase.table("scrape_targets").update({"last_scraped_at": now.isoformat()}).eq("id", target_id).execute()
        
        results.append({
            "company_name": company_name,
            "jobs_found": len(jobs),
            "new_inserted": new_inserted
        })

    return {"processed": len(due_targets), "results": results}
