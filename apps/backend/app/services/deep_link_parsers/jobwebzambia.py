"""jobwebzambia.com listing parser."""
from __future__ import annotations

import re

from bs4 import BeautifulSoup

from app.services.deep_link_phone import extract_phones_from_text
from app.services.deep_link_parsers.base import (
    ApplyContact,
    build_contact,
    emails_from_scope,
    links_from_scope,
)

_APPLICATION_HEADING_RE = re.compile(
    r"method\s+of\s+application|how\s+to\s+apply|application\s+instructions",
    re.IGNORECASE,
)


def _apply_scopes(soup: BeautifulSoup) -> list:
    scopes: list = []
    for selector in (".apply-instructions", ".job-application", "section.job-application"):
        node = soup.select_one(selector)
        if node is not None:
            scopes.append(node)
    if scopes:
        return scopes
    for heading in soup.find_all(["h1", "h2", "h3", "h4"]):
        title = heading.get_text(" ", strip=True) or ""
        if not _APPLICATION_HEADING_RE.search(title):
            continue
        block = soup.new_tag("div")
        for sib in heading.next_siblings:
            if getattr(sib, "name", None) in ("h1", "h2", "h3", "h4"):
                break
            block.append(sib)
        if block.contents:
            scopes.append(block)
    if not scopes:
        content = soup.select_one(".entry-content, article, .post-content")
        if content is not None:
            paragraphs = content.find_all("p")
            if paragraphs:
                scopes.append(paragraphs[-1])
    return scopes or [soup]


def parse(html: str, base_url: str) -> ApplyContact:
    soup = BeautifulSoup(html, "html.parser")
    scopes = _apply_scopes(soup)
    emails: list[str] = []
    links: list[str] = []
    phones: list[str] = []
    for scope in scopes:
        emails.extend(emails_from_scope(scope, html))
        links.extend(links_from_scope(scope, base_url))
        phones.extend(extract_phones_from_text(scope.get_text(" ", strip=True)))
    return build_contact(
        parser_name="jobwebzambia",
        page_url=base_url,
        emails=emails,
        links=links,
        phones=phones,
        found_in_target_section=bool(scopes and scopes[0] is not soup),
    )
