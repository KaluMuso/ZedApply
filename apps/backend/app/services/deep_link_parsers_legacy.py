"""Legacy EnrichmentResult API wrapping v2 ApplyContact parsers."""
from __future__ import annotations

import json
import re
from typing import Optional
from urllib.parse import urlparse

from bs4 import BeautifulSoup
from pydantic import BaseModel

from app.services.deep_link_phone import extract_phones_from_text
from app.services.deep_link_parsers.base import ApplyContact, build_contact, emails_from_scope
from app.services.deep_link_parsers import careersinafrica as _careersinafrica
from app.services.deep_link_parsers import everjobs_zm as _everjobs_zm
from app.services.deep_link_parsers import generic_fallback as _generic_fallback
from app.services.deep_link_parsers import gozambiajobs as _gozambiajobs
from app.services.deep_link_parsers import jobsearchzambia as _jobsearchzambia
from app.services.deep_link_parsers import jobwebzambia as _jobwebzambia

_LINKEDIN_HOST_RE = re.compile(r"(^|\.)linkedin\.com$", re.IGNORECASE)


class EnrichmentResult(BaseModel):
    apply_url: Optional[str] = None
    apply_email: Optional[str] = None
    apply_source: Optional[str] = None
    contact_phone: Optional[str] = None
    redirect_url: Optional[str] = None
    parser: Optional[str] = None
    parser_confidence: Optional[float] = None


def contact_to_enrichment(contact: ApplyContact) -> EnrichmentResult:
    apply_source = None
    if contact.apply_email or contact.apply_url:
        apply_source = "enriched"
    return EnrichmentResult(
        apply_url=contact.apply_url,
        apply_email=contact.apply_email,
        contact_phone=contact.contact_phone,
        apply_source=apply_source,
        redirect_url=contact.redirect_url,
        parser=contact.parser_name,
        parser_confidence=contact.parser_confidence,
    )


def parse_gozambiajobs(html: str, url: str) -> EnrichmentResult:
    return contact_to_enrichment(_gozambiajobs.parse(html, url))


def parse_jobwebzambia(html: str, url: str) -> EnrichmentResult:
    return contact_to_enrichment(_jobwebzambia.parse(html, url))


def parse_jobsearchzm(html: str, url: str) -> EnrichmentResult:
    return contact_to_enrichment(_jobsearchzambia.parse(html, url))


def parse_careersinafrica(html: str, url: str) -> EnrichmentResult:
    return contact_to_enrichment(_careersinafrica.parse(html, url))


def parse_everjobs_zm(html: str, url: str) -> EnrichmentResult:
    return contact_to_enrichment(_everjobs_zm.parse(html, url))


def _linkedin_employer_url(soup: BeautifulSoup) -> Optional[str]:
    from app.services.deep_link_parsers.base import normalize_http_url

    for meta in soup.find_all("meta"):
        prop = (meta.get("property") or meta.get("name") or "").lower()
        if prop in ("og:see_also", "og:url", "twitter:app:url:iphone"):
            content = (meta.get("content") or "").strip()
            if content and not _LINKEDIN_HOST_RE.search(urlparse(content).netloc or ""):
                return normalize_http_url(content, content)
    for script in soup.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(script.string or "")
        except (json.JSONDecodeError, TypeError):
            continue
        items = data if isinstance(data, list) else [data]
        for item in items:
            if not isinstance(item, dict):
                continue
            org = item.get("hiringOrganization") or item.get("employer") or {}
            if isinstance(org, dict):
                site = org.get("sameAs") or org.get("url")
                if isinstance(site, str):
                    normalized = normalize_http_url(site, site)
                    if normalized and not _LINKEDIN_HOST_RE.search(
                        urlparse(normalized).netloc or ""
                    ):
                        return normalized
    return None


def parse_linkedin(html: str, url: str) -> EnrichmentResult:
    soup = BeautifulSoup(html, "html.parser")
    emails = emails_from_scope(soup, html)
    redirect_url = _linkedin_employer_url(soup)
    phones = extract_phones_from_text(soup.get_text(" ", strip=True))
    contact = build_contact(
        parser_name="linkedin",
        page_url=url,
        emails=emails,
        links=[],
        phones=phones,
        found_in_target_section=False,
        redirect_url=redirect_url,
    )
    return contact_to_enrichment(contact)


def parse_generic(html: str, url: str) -> EnrichmentResult:
    return contact_to_enrichment(_generic_fallback.parse(html, url))
