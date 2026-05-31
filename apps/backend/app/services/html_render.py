"""Markdown → sanitized HTML for job descriptions (WYSIWYG display)."""
from __future__ import annotations

import re

import bleach
import markdown as md_lib

# Whitelist aligned with product spec: headings, lists, emphasis, safe links.
_ALLOWED_TAGS = [
    "h2",
    "h3",
    "p",
    "ul",
    "ol",
    "li",
    "strong",
    "em",
    "a",
    "br",
]
_ALLOWED_ATTRS = {
    "a": ["href", "title", "rel", "target"],
}
_ALLOWED_PROTOCOLS = ["http", "https", "mailto"]


def _ensure_link_rel(html: str) -> str:
    """Add rel=noopener to external links when bleach left target=_blank."""
    return re.sub(
        r'<a\s+([^>]*href="https?://[^"]+"[^>]*)>',
        lambda m: (
            m.group(0)
            if "rel=" in m.group(1)
            else f'<a {m.group(1).rstrip()} rel="noopener noreferrer" target="_blank">'
        ),
        html,
        flags=re.IGNORECASE,
    )


def render_markdown_to_html(markdown_text: str | None) -> str:
    """Convert markdown to bleach-sanitized HTML."""
    if not markdown_text or not str(markdown_text).strip():
        return ""
    raw_html = md_lib.markdown(
        str(markdown_text),
        extensions=["fenced_code", "nl2br"],
    )
    cleaned = bleach.clean(
        raw_html,
        tags=_ALLOWED_TAGS,
        attributes=_ALLOWED_ATTRS,
        protocols=_ALLOWED_PROTOCOLS,
        strip=True,
    )
    return _ensure_link_rel(cleaned)


_SECTION_MD_TO_HTML_KEY = {
    "section_responsibilities": "responsibilities",
    "section_requirements": "requirements",
    "section_benefits": "benefits",
    "section_how_to_apply": "how_to_apply",
    "section_about": "about",
}

_SECTION_TITLES = {
    "responsibilities": "Responsibilities",
    "requirements": "Requirements",
    "benefits": "Benefits",
    "how_to_apply": "How to apply",
    "about": "About",
}


def render_section_html(sections: dict[str, str | None]) -> dict[str, str]:
    """Render DB section_* markdown columns into section_html dict."""
    out: dict[str, str] = {}
    for col, key in _SECTION_MD_TO_HTML_KEY.items():
        body = sections.get(col)
        if not body or not str(body).strip():
            continue
        md = str(body).strip()
        if not md.startswith("##"):
            md = f"## {_SECTION_TITLES[key]}\n\n{md}"
        html = render_markdown_to_html(md)
        if html:
            out[key] = html
    return out


def render_job_description_html(
    description_md: str | None,
    sections: dict[str, str | None] | None = None,
) -> tuple[str, dict[str, str]]:
    """Full-body HTML plus per-section HTML map."""
    description_html = render_markdown_to_html(description_md)
    section_html = render_section_html(sections or {})
    return description_html, section_html
