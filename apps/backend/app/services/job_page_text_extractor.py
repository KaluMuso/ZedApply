"""Extract plain job-posting text and employer apply links from scraped HTML."""
from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from typing import Iterable
from urllib.parse import urljoin, urlparse

from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

# Zambian job-board aggregators — apply_url often points here instead of the employer.
AGGREGATOR_DOMAINS: frozenset[str] = frozenset(
    {
        "jobwebzambia.com",
        "gozambiajobs.com",
        "jobsearchzambia.com",
        "jobsearchzm.com",
        "careersinafrica.com",
        "everjobs.com.zm",
    }
)

_LINK_TEXT_KEYWORDS: tuple[str, ...] = (
    "company website",
    "company site",
    "apply on company",
    "submit your cv",
    "submit cv",
    "apply now",
    "apply online",
    "apply here",
    "apply",
)

_URL_PATH_KEYWORDS: tuple[str, ...] = (
    "apply",
    "career",
    "vacanc",
    "recruit",
    "job",
    "workday",
    "myworkday",
)

_MAX_CHARS = 12_000
_MIN_USEFUL_LEN = 80

_JOB_CONTAINER_SELECTORS: tuple[str, ...] = (
    "article",
    "main",
    "[class*='job-description']",
    "[class*='job_description']",
    "[class*='job-detail']",
    "[class*='vacancy']",
    "[id*='job-description']",
    "[id*='job_description']",
)

_NOISE_TAGS = ("script", "style", "nav", "footer", "header", "noscript", "svg")


def _meta_content(soup: BeautifulSoup, *, prop: str | None = None, name: str | None = None) -> str:
    if prop:
        tag = soup.find("meta", property=prop)
    else:
        tag = soup.find("meta", attrs={"name": name})
    if not tag:
        return ""
    content = tag.get("content")
    return str(content).strip() if content else ""


def _text_from_nodes(nodes: Iterable) -> str:
    chunks: list[str] = []
    for node in nodes:
        if node is None:
            continue
        text = node.get_text("\n", strip=True) if hasattr(node, "get_text") else ""
        if text:
            chunks.append(text)
    return "\n\n".join(chunks)


def _collapse_whitespace(text: str) -> str:
    lines = [re.sub(r"[ \t]+", " ", line).strip() for line in text.splitlines()]
    lines = [ln for ln in lines if ln]
    return re.sub(r"\n{3,}", "\n\n", "\n".join(lines)).strip()


def extract_page_text_for_description(html: str, page_url: str = "") -> str:
    """Best-effort posting body for LLM enrichment after a deep-link fetch."""
    if not (html or "").strip():
        return ""

    soup = BeautifulSoup(html, "html.parser")
    for tag_name in _NOISE_TAGS:
        for tag in soup.find_all(tag_name):
            tag.decompose()

    candidates: list[str] = []
    for meta in (
        _meta_content(soup, prop="og:description"),
        _meta_content(soup, name="description"),
    ):
        if len(meta) >= _MIN_USEFUL_LEN:
            candidates.append(meta)

    for selector in _JOB_CONTAINER_SELECTORS:
        nodes = soup.select(selector)
        if nodes:
            block = _collapse_whitespace(_text_from_nodes(nodes))
            if len(block) >= _MIN_USEFUL_LEN:
                candidates.append(block)

    body = soup.body or soup
    body_text = _collapse_whitespace(body.get_text("\n", strip=True))
    if len(body_text) >= _MIN_USEFUL_LEN:
        candidates.append(body_text)

    if not candidates:
        return ""

    # Prefer the longest substantive block (posting pages beat nav crumbs).
    best = max(candidates, key=len)
    host = (urlparse(page_url).netloc or "").lower()
    if host and host in best.lower() and len(best) < 400:
        # Very short meta-only snippets are weak; keep body if longer exists.
        if len(body_text) > len(best):
            best = body_text

    return best[:_MAX_CHARS]


def _normalize_hostname(url: str) -> str:
    host = (urlparse(url).netloc or "").lower()
    if host.startswith("www."):
        return host[4:]
    return host


def is_aggregator(url: str) -> bool:
    """True when URL hostname is a known Zambian job-board aggregator."""
    if not (url or "").strip():
        return False
    host = _normalize_hostname(url)
    if not host:
        return False
    if host in AGGREGATOR_DOMAINS:
        return True
    return any(host.endswith(f".{domain}") for domain in AGGREGATOR_DOMAINS)


def _normalize_http_url(href: str, base_url: str) -> str | None:
    href = (href or "").strip()
    if not href or href.startswith(("mailto:", "tel:", "javascript:", "#")):
        return None
    absolute = urljoin(base_url, href)
    parsed = urlparse(absolute)
    if parsed.scheme not in ("http", "https"):
        return None
    return absolute[:2000]


@dataclass(frozen=True)
class ApplyContacts:
    """Employer apply path discovered on an aggregator listing page."""

    apply_url: str | None = None
    apply_email: str | None = None
    contact_phone: str | None = None


def _score_apply_anchor(link_text: str, target_url: str, aggregator_host: str) -> int:
    host = _normalize_hostname(target_url)
    if not host or host == aggregator_host or is_aggregator(target_url):
        return -1
    score = 0
    lower_text = link_text.lower()
    lower_url = target_url.lower()
    if "company website" in lower_text or "company site" in lower_text:
        score += 30
    if any(kw in lower_text for kw in _LINK_TEXT_KEYWORDS):
        score += 15
    if any(kw in lower_url for kw in _URL_PATH_KEYWORDS):
        score += 8
    if lower_text.strip() in ("apply", "apply now", "apply here"):
        score += 5
    return score


def _heuristic_external_apply_url(html: str, page_url: str) -> str | None:
    """Pick the best external apply link from anchor text and URL heuristics."""
    soup = BeautifulSoup(html, "html.parser")
    aggregator_host = _normalize_hostname(page_url)
    best_url: str | None = None
    best_score = -1
    for anchor in soup.find_all("a", href=True):
        href = str(anchor.get("href") or "")
        normalized = _normalize_http_url(href, page_url)
        if not normalized:
            continue
        text = anchor.get_text(" ", strip=True) or ""
        score = _score_apply_anchor(text, normalized, aggregator_host)
        if score > best_score:
            best_score = score
            best_url = normalized
    if best_url and best_score > 0:
        return best_url
    for anchor in soup.find_all("a", href=True):
        href = str(anchor.get("href") or "")
        normalized = _normalize_http_url(href, page_url)
        if not normalized:
            continue
        host = _normalize_hostname(normalized)
        if host and host != aggregator_host and not is_aggregator(normalized):
            lower = normalized.lower()
            if any(kw in lower for kw in _URL_PATH_KEYWORDS):
                return normalized
    return None


def extract_apply_contacts_from_page(html: str, source_url: str) -> ApplyContacts:
    """Extract employer apply_url, apply_email, and contact_phone from listing HTML."""
    if not (html or "").strip():
        return ApplyContacts()

    from app.services.deep_link_router import route_and_parse

    parsed = route_and_parse(html, source_url) if is_aggregator(source_url) else None
    heuristic_url = _heuristic_external_apply_url(html, source_url)

    apply_url = heuristic_url
    if not apply_url and parsed and parsed.apply_url and not is_aggregator(parsed.apply_url):
        apply_url = parsed.apply_url

    apply_email = parsed.apply_email if parsed else None
    contact_phone = parsed.contact_phone if parsed else None

    return ApplyContacts(
        apply_url=apply_url,
        apply_email=apply_email,
        contact_phone=contact_phone,
    )


def extract_real_apply_url(page_html: str, source_url: str) -> str | None:
    """Return the employer apply URL when the listing page is an aggregator."""
    return extract_apply_contacts_from_page(page_html, source_url).apply_url


async def resolve_apply_contacts_from_aggregator_url(apply_url: str) -> ApplyContacts:
    """Fetch an aggregator apply_url page and resolve employer apply contacts."""
    url = (apply_url or "").strip()
    if not url.startswith(("http://", "https://")) or not is_aggregator(url):
        return ApplyContacts()

    from app.services.deep_link_enricher import fetch_page

    try:
        status, ctype, body = await fetch_page(url)
    except Exception as exc:
        logger.info("aggregator apply fetch failed for %s: %s", url, exc)
        return ApplyContacts()

    if status >= 400 or not body:
        return ApplyContacts()
    if "html" not in ctype.lower() and "<html" not in body[:500].lower():
        return ApplyContacts()

    return extract_apply_contacts_from_page(body, url)


def merge_resolved_apply_contacts(
    job_data: dict,
    contacts: ApplyContacts,
    *,
    original_apply_url: str,
) -> None:
    """Patch job_data in place; keep aggregator apply_url when resolution fails."""
    if contacts.apply_url:
        job_data["apply_url"] = contacts.apply_url
        job_data["apply_source"] = "aggregator_deep_link"
    if contacts.apply_email and not job_data.get("apply_email"):
        job_data["apply_email"] = contacts.apply_email
    if contacts.contact_phone and not job_data.get("contact_phone"):
        job_data["contact_phone"] = contacts.contact_phone
    if not contacts.apply_url:
        job_data.setdefault("apply_url", original_apply_url)
