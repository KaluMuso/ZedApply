"""everjobs.com.zm listing parser."""
from __future__ import annotations

from bs4 import BeautifulSoup

from app.services.deep_link_phone import extract_phones_from_text
from app.services.deep_link_parsers.base import (
    ApplyContact,
    build_contact,
    emails_from_scope,
    links_from_scope,
)


def parse(html: str, base_url: str) -> ApplyContact:
    soup = BeautifulSoup(html, "html.parser")
    scope = soup.select_one(
        "div.apply-area, .apply-area, [class*='apply-area']"
    )
    in_section = scope is not None
    target = scope if scope is not None else soup

    emails = emails_from_scope(target, html)
    links = links_from_scope(target, base_url)
    phones = extract_phones_from_text(target.get_text(" ", strip=True))

    return build_contact(
        parser_name="everjobs_zm",
        page_url=base_url,
        emails=emails,
        links=links,
        phones=phones,
        found_in_target_section=in_section,
    )
