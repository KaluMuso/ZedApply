"""Per-aggregator apply-contact parser registry (v2)."""
from __future__ import annotations

from app.services.deep_link_parsers.base import (
    AGGREGATOR_DOMAINS,
    CONFIDENCE_UPDATE_THRESHOLD,
    ApplyContact,
    ParserFn,
    is_aggregator_url,
    normalize_hostname,
)
from . import (
    careersinafrica,
    everjobs_zm,
    generic_fallback,
    gozambiajobs,
    jobsearchzambia,
    jobwebzambia,
)

PARSER_REGISTRY: dict[str, ParserFn] = {
    "jobwebzambia.com": jobwebzambia.parse,
    "gozambiajobs.com": gozambiajobs.parse,
    "jobsearchzambia.com": jobsearchzambia.parse,
    "jobsearchzm.com": jobsearchzambia.parse,
    "careersinafrica.com": careersinafrica.parse,
    "everjobs.com.zm": everjobs_zm.parse,
}

PARSER_CONFIDENCE_THRESHOLDS: dict[str, float] = {
    "jobwebzambia": 0.75,
    "gozambiajobs": 0.75,
    "jobsearchzambia": 0.75,
    "careersinafrica": 0.72,
    "everjobs_zm": 0.75,
    "generic_fallback": 0.70,
}

DOMAIN_TO_PARSER_NAME: dict[str, str] = {
    "jobwebzambia.com": "jobwebzambia",
    "gozambiajobs.com": "gozambiajobs",
    "jobsearchzambia.com": "jobsearchzambia",
    "jobsearchzm.com": "jobsearchzambia",
    "careersinafrica.com": "careersinafrica",
    "everjobs.com.zm": "everjobs_zm",
}


def parser_name_for_url(url: str) -> str:
    host = normalize_hostname(url)
    return DOMAIN_TO_PARSER_NAME.get(host, "generic_fallback")


def get_parser(url: str) -> ParserFn:
    host = normalize_hostname(url)
    return PARSER_REGISTRY.get(host, generic_fallback.parse)


def parse_with_registry(html: str, source_url: str) -> ApplyContact:
    """Run domain-specific parser, then generic fallback if confidence is low."""
    parser_fn = get_parser(source_url)
    result = parser_fn(html, source_url)
    threshold = PARSER_CONFIDENCE_THRESHOLDS.get(
        result.parser_name or "", CONFIDENCE_UPDATE_THRESHOLD
    )
    if result.parser_confidence >= threshold or (
        result.apply_email or result.apply_url or result.contact_phone
    ):
        if result.parser_name is None:
            return ApplyContact(
                apply_url=result.apply_url,
                apply_email=result.apply_email,
                contact_phone=result.contact_phone,
                parser_confidence=result.parser_confidence,
                parser_name=parser_name_for_url(source_url),
                redirect_url=result.redirect_url,
            )
        return result

    fallback = generic_fallback.parse(html, source_url)
    if fallback.parser_confidence > result.parser_confidence:
        return fallback
    if fallback.apply_url or fallback.apply_email or fallback.contact_phone:
        if not (result.apply_url or result.apply_email or result.contact_phone):
            return fallback
    return result


def should_update_apply_url(contact: ApplyContact, *, original_url: str) -> bool:
    """True when v2 parser is confident and resolved URL leaves aggregators."""
    if contact.parser_confidence < CONFIDENCE_UPDATE_THRESHOLD:
        return False
    if contact.apply_url and not is_aggregator_url(contact.apply_url):
        return contact.apply_url.strip() != original_url.strip()
    return False


from app.services.deep_link_parsers_legacy import (  # noqa: E402
    EnrichmentResult,
    parse_generic,
    parse_gozambiajobs,
    parse_jobsearchzm,
    parse_jobwebzambia,
    parse_linkedin,
)

__all__ = [
    "AGGREGATOR_DOMAINS",
    "CONFIDENCE_UPDATE_THRESHOLD",
    "ApplyContact",
    "DOMAIN_TO_PARSER_NAME",
    "EnrichmentResult",
    "PARSER_CONFIDENCE_THRESHOLDS",
    "PARSER_REGISTRY",
    "get_parser",
    "parse_generic",
    "parse_gozambiajobs",
    "parse_jobsearchzm",
    "parse_jobwebzambia",
    "parse_linkedin",
    "parse_with_registry",
    "parser_name_for_url",
    "should_update_apply_url",
]
