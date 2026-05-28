"""gozambiajobs.com listing parser."""
from __future__ import annotations

import re

from bs4 import BeautifulSoup

from app.services.deep_link_phone import extract_phones_from_text
from app.services.deep_link_parsers.base import (
    ApplyContact,
    build_contact,
    dedupe_emails,
    emails_from_scope,
    links_from_scope,
    normalize_http_url,
)

_APPLY_ROW_RE = re.compile(r"apply|how\s+to\s+apply", re.IGNORECASE)


def _table_apply_scope(soup: BeautifulSoup):
    for table in soup.select("table.job-info, table"):
        classes = " ".join(table.get("class") or []).lower()
        if "job-info" in classes or table.select("th, td"):
            for row in table.find_all("tr"):
                cells = row.find_all(["th", "td"])
                if len(cells) < 2:
                    continue
                label = cells[0].get_text(" ", strip=True) or ""
                if _APPLY_ROW_RE.search(label):
                    return cells[1]
    section = soup.select_one(
        "motion.div.application-method, div.application-method"
    )
    return section


def parse(html: str, base_url: str) -> ApplyContact:
    soup = BeautifulSoup(html, "html.parser")
    scope = _table_apply_scope(soup)
    if scope is None:
        scope = soup
        in_section = False
    else:
        in_section = True

    emails = emails_from_scope(scope, html)
    links = links_from_scope(scope, base_url)
    phones = extract_phones_from_text(scope.get_text(" ", strip=True))

    if not links:
        for anchor in soup.find_all("a", href=True):
            label = (anchor.get_text(" ", strip=True) or "").lower()
            href = str(anchor.get("href") or "")
            if "apply" in label:
                if href.lower().startswith("mailto:"):
                    addr = href.split(":", 1)[-1].split("?")[0].strip()
                    if addr:
                        emails.append(addr)
                else:
                    normalized = normalize_http_url(href, base_url)
                    if normalized:
                        links.append(normalized)

    return build_contact(
        parser_name="gozambiajobs",
        page_url=base_url,
        emails=dedupe_emails(emails),
        links=links,
        phones=phones,
        found_in_target_section=in_section,
    )
