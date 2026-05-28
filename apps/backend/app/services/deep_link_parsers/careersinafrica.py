"""careersinafrica.com listing parser."""
from __future__ import annotations

import re

from bs4 import BeautifulSoup

from app.services.deep_link_phone import extract_phones_from_text
from app.services.deep_link_parsers.base import (
    ApplyContact,
    build_contact,
    emails_from_scope,
    is_aggregator_url,
    links_from_scope,
    normalize_http_url,
)

_APPLY_BUTTON_RE = re.compile(r"apply|submit", re.IGNORECASE)


def _apply_button_redirect(soup: BeautifulSoup, base_url: str) -> str | None:
    candidates: list[tuple[int, str]] = []
    for anchor in soup.find_all("a", href=True):
        text = anchor.get_text(" ", strip=True) or ""
        href = str(anchor.get("href") or "")
        if not _APPLY_BUTTON_RE.search(text):
            continue
        normalized = normalize_http_url(href, base_url)
        if not normalized:
            continue
        score = 10 if "apply" in text.lower() else 5
        if is_aggregator_url(normalized):
            score += 3
        candidates.append((score, normalized))
    if not candidates:
        return None
    candidates.sort(key=lambda item: item[0], reverse=True)
    return candidates[0][1]


def parse(html: str, base_url: str) -> ApplyContact:
    soup = BeautifulSoup(html, "html.parser")
    scopes = soup.select(
        '[data-hook*="apply"], .apply-section, section[class*="job"]'
    )
    scope = scopes[0] if scopes else soup
    in_section = bool(scopes)

    emails = emails_from_scope(scope, html)
    links = links_from_scope(scope, base_url)
    phones = extract_phones_from_text(scope.get_text(" ", strip=True))

    redirect = _apply_button_redirect(soup, base_url)
    apply_url = None
    if redirect and not is_aggregator_url(redirect):
        apply_url = redirect
        links = [redirect, *links]

    contact = build_contact(
        parser_name="careersinafrica",
        page_url=base_url,
        emails=emails,
        links=links,
        phones=phones,
        found_in_target_section=in_section,
        redirect_url=redirect if redirect and is_aggregator_url(redirect) else None,
    )
    if apply_url and contact.apply_url is None:
        return ApplyContact(
            apply_url=apply_url,
            apply_email=contact.apply_email,
            contact_phone=contact.contact_phone,
            parser_confidence=max(contact.parser_confidence, 0.82),
            parser_name="careersinafrica",
        )
    return contact
