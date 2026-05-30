"""Route source URLs to the correct deep-link HTML parser."""
from __future__ import annotations

from urllib.parse import urlparse

from app.services.deep_link_parsers import parse_with_registry, parser_name_for_url
from app.services.deep_link_parsers_legacy import (
    EnrichmentResult,
    contact_to_enrichment,
    parse_linkedin,
)


def detect_parser_name(url: str) -> str:
    """Map source URL hostname to a parser name."""
    host = (urlparse(url).netloc or "").lower()
    if "linkedin.com" in host:
        return "linkedin"
    return parser_name_for_url(url)


def route_and_parse(html: str, url: str) -> EnrichmentResult:
    """Detect aggregator from URL hostname and run the matching v2 parser."""
    parser_name = detect_parser_name(url)
    if parser_name == "linkedin":
        return parse_linkedin(html, url)
    contact = parse_with_registry(html, url)
    return contact_to_enrichment(contact)


def parser_outcome(result: EnrichmentResult) -> str:
    """Classify parser result for telemetry."""
    has_email = bool(result.apply_email)
    has_phone = bool(result.contact_phone)
    if has_email and has_phone:
        return "found_both"
    if has_email:
        return "found_email"
    if has_phone:
        return "found_phone"
    return "failed"
