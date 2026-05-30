"""jobsearchzambia.com / jobsearchzm.com listing parser."""
from __future__ import annotations

import re

from bs4 import BeautifulSoup

from app.services.deep_link_phone import extract_phones_from_text
from app.services.deep_link_parsers.base import (
    ApplyContact,
    build_contact,
    emails_from_scope,
    links_from_scope,
    normalize_http_url,
)

_APPLICATION_RE = re.compile(r"application|how\s+to\s+apply|apply", re.IGNORECASE)


def _application_scope(soup: BeautifulSoup):
    for heading in soup.find_all(["h2", "h3", "h4", "strong"]):
        title = heading.get_text(" ", strip=True) or ""
        if not _APPLICATION_RE.search(title):
            continue
        block = soup.new_tag("div")
        for sib in heading.next_siblings:
            if getattr(sib, "name", None) in ("h1", "h2", "h3", "h4"):
                break
            block.append(sib)
        if block.contents:
            return block
    for table in soup.select("table"):
        for row in table.find_all("tr"):
            cells = row.find_all(["th", "td"])
            if len(cells) < 2:
                continue
            label = cells[0].get_text(" ", strip=True) or ""
            if _APPLICATION_RE.search(label):
                return cells[1]
    return None


def parse(html: str, base_url: str) -> ApplyContact:
    soup = BeautifulSoup(html, "html.parser")
    scope = _application_scope(soup)
    in_section = scope is not None
    target = scope if scope is not None else soup

    emails = emails_from_scope(target, html)
    links = links_from_scope(target, base_url)
    phones = extract_phones_from_text(target.get_text(" ", strip=True))

    for anchor in soup.find_all("a", href=True):
        label = (anchor.get_text(" ", strip=True) or "").lower()
        href = str(anchor.get("href") or "")
        if "apply now" in label or label.strip() == "apply":
            if href.lower().startswith("mailto:"):
                addr = href.split(":", 1)[-1].split("?")[0].strip()
                if addr:
                    emails.append(addr)
            else:
                normalized = normalize_http_url(href, base_url)
                if normalized:
                    links.append(normalized)

    return build_contact(
        parser_name="jobsearchzambia",
        page_url=base_url,
        emails=emails,
        links=links,
        phones=phones,
        found_in_target_section=in_section,
    )
