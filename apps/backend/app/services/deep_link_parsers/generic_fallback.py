"""Generic document-wide apply contact extraction (v1 heuristic)."""
from __future__ import annotations

import re

from bs4 import BeautifulSoup

from app.services.deep_link_phone import extract_phones_from_text
from app.services.deep_link_parsers.base import (
    ApplyContact,
    _EMAIL_RE,
    build_contact,
    emails_from_scope,
    is_aggregator_url,
    is_non_apply_url,
    links_from_scope,
    normalize_hostname,
    normalize_http_url,
    pick_external_apply_url,
    score_confidence,
)

_APPLICATION_HEADING_RE = re.compile(
    r"method\s+of\s+application|how\s+to\s+apply|application\s+instructions",
    re.IGNORECASE,
)

_LINK_TEXT_KEYWORDS: tuple[str, ...] = (
    "company website",
    "company site",
    "apply on company",
    "submit your cv",
    "submit cv",
    "apply now",
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


def _score_apply_anchor(
    link_text: str,
    target_url: str,
    aggregator_host: str,
    *,
    in_application_section: bool = False,
) -> int:
    host = normalize_hostname(target_url)
    if (
        not host
        or host == aggregator_host
        or is_aggregator_url(target_url)
        or is_non_apply_url(target_url)
    ):
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
    if in_application_section and "click here" in lower_text:
        score += 12
    if in_application_section and score == 0:
        score = 3
    return score


def _application_section_nodes(soup: BeautifulSoup) -> list[list]:
    sections: list[list] = []
    for heading in soup.find_all(["h1", "h2", "h3", "h4"]):
        title = heading.get_text(" ", strip=True) or ""
        if not _APPLICATION_HEADING_RE.search(title):
            continue
        nodes: list = [heading]
        for sib in heading.next_siblings:
            if getattr(sib, "name", None) in ("h1", "h2", "h3", "h4"):
                break
            nodes.append(sib)
        sections.append(nodes)
    legacy = soup.select_one(".job-application, section.job-application")
    if legacy is not None:
        sections.append([legacy])
    return sections


def _first_email_in_text(text: str) -> str | None:
    for match in _EMAIL_RE.finditer(text):
        addr = match.group(0).strip().lower()
        if addr and not addr.endswith((".png", ".jpg", ".gif")):
            return addr
    return None


def parse(html: str, base_url: str) -> ApplyContact:
    soup = BeautifulSoup(html, "html.parser")
    aggregator_host = normalize_hostname(base_url)
    best_url: str | None = None
    best_score = -1
    apply_email: str | None = None
    contact_phone: str | None = None
    section_text_parts: list[str] = []
    in_section = False

    for nodes in _application_section_nodes(soup):
        in_section = True
        for node in nodes:
            if not hasattr(node, "find_all"):
                text = str(node).strip()
                if text:
                    section_text_parts.append(text)
                continue
            section_text_parts.append(node.get_text(" ", strip=True))
            for anchor in node.find_all("a", href=True):
                href = str(anchor.get("href") or "")
                lower_href = href.lower()
                text = anchor.get_text(" ", strip=True) or ""
                if lower_href.startswith("mailto:"):
                    addr = href.split(":", 1)[-1].split("?")[0].strip().lower()
                    if addr and not apply_email:
                        apply_email = addr
                    continue
                if lower_href.startswith("tel:"):
                    phones = extract_phones_from_text(
                        href.split(":", 1)[-1].strip()
                    )
                    if phones and not contact_phone:
                        contact_phone = phones[0]
                    continue
                normalized = normalize_http_url(href, base_url)
                if not normalized:
                    continue
                score = _score_apply_anchor(
                    text,
                    normalized,
                    aggregator_host,
                    in_application_section=True,
                )
                if score > best_score:
                    best_score = score
                    best_url = normalized

    combined = " ".join(section_text_parts)
    if not apply_email:
        apply_email = _first_email_in_text(combined)
    if not contact_phone:
        phones = extract_phones_from_text(combined)
        if phones:
            contact_phone = phones[0]

    if best_url and best_score >= 0:
        confidence = score_confidence(
            apply_url=best_url,
            apply_email=apply_email,
            page_url=base_url,
            found_in_target_section=in_section,
        )
        return ApplyContact(
            apply_url=best_url,
            apply_email=apply_email,
            contact_phone=contact_phone,
            parser_confidence=confidence,
            parser_name="generic_fallback",
        )

    emails = emails_from_scope(soup, html)
    links = links_from_scope(soup, base_url)
    phones = extract_phones_from_text(soup.get_text(" ", strip=True))
    heuristic_url = pick_external_apply_url(links, base_url)
    if not heuristic_url:
        for anchor in soup.find_all("a", href=True):
            href = str(anchor.get("href") or "")
            normalized = normalize_http_url(href, base_url)
            if not normalized:
                continue
            text = anchor.get_text(" ", strip=True) or ""
            score = _score_apply_anchor(text, normalized, aggregator_host)
            if score > best_score:
                best_score = score
                heuristic_url = normalized

    return build_contact(
        parser_name="generic_fallback",
        page_url=base_url,
        emails=emails if not apply_email else [apply_email, *emails],
        links=[heuristic_url] if heuristic_url else links,
        phones=phones if not contact_phone else [contact_phone, *phones],
        found_in_target_section=False,
    )
