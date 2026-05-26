"""Scraping-source provenance helpers for multi-aggregator dedup."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from urllib.parse import urlparse


def infer_source_type(url: str | None) -> str:
    """Map a listing URL to a stable source_type label."""
    if not url:
        return "other"
    lower = url.lower()
    if "jobwebzambia" in lower:
        return "jobwebzambia"
    if "gozambiajobs" in lower:
        return "gozambiajobs"
    if "jobsearchzambia" in lower:
        return "jobsearchzambia"
    if "whatsapp" in lower:
        return "whatsapp"
    host = (urlparse(url).netloc or "").lower()
    if host:
        return host.removeprefix("www.")
    return "other"


def build_source_entry(
    url: str,
    *,
    scraped_at: datetime | str | None = None,
    source_type: str | None = None,
) -> dict[str, str]:
    """Build one scraping_sources JSON object."""
    when = scraped_at or datetime.now(timezone.utc)
    if isinstance(when, datetime):
        when_str = when.isoformat()
    else:
        when_str = str(when)
    return {
        "url": url.strip(),
        "source_type": source_type or infer_source_type(url),
        "scraped_at": when_str,
    }


def _normalize_sources(raw: Any) -> list[dict[str, str]]:
    if not raw:
        return []
    if not isinstance(raw, list):
        return []
    out: list[dict[str, str]] = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        url = str(item.get("url") or "").strip()
        if not url:
            continue
        out.append(
            {
                "url": url,
                "source_type": str(item.get("source_type") or infer_source_type(url)),
                "scraped_at": str(item.get("scraped_at") or datetime.now(timezone.utc).isoformat()),
            }
        )
    return out


def merge_scraping_sources(
    existing: Any,
    new_url: str | None,
    *,
    scraped_at: datetime | str | None = None,
) -> list[dict[str, str]]:
    """Append ``new_url`` if not already present (URL-normalized)."""
    sources = _normalize_sources(existing)
    if not new_url or not str(new_url).strip():
        return sources
    url = str(new_url).strip()
    seen = {s["url"].rstrip("/").lower() for s in sources}
    key = url.rstrip("/").lower()
    if key in seen:
        return sources
    sources.append(build_source_entry(url, scraped_at=scraped_at))
    return sources


def source_label(source_type: str) -> str:
    """Human label for admin UI chips."""
    labels = {
        "jobwebzambia": "jobwebzambia",
        "gozambiajobs": "gozambiajobs",
        "jobsearchzambia": "jobsearchzambia",
        "whatsapp": "whatsapp",
    }
    return labels.get(source_type, source_type.replace("_", " "))
