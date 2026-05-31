"""Tests for markdown → sanitized HTML rendering."""
from app.services.html_render import render_markdown_to_html, render_section_html


def test_strips_script_tags():
    md = "## Hello\n\n<script>alert(1)</script>\n\nSafe text."
    html = render_markdown_to_html(md)
    assert "<script>" not in html.lower()
    assert "Safe text" in html


def test_allows_safe_headings_and_lists():
    md = "## Responsibilities\n\n- Item one\n- Item two"
    html = render_markdown_to_html(md)
    assert "<h2>" in html
    assert "<li>" in html
    assert "Item one" in html


def test_external_links_get_noopener():
    md = "[Apply](https://employer.example/apply)"
    html = render_markdown_to_html(md)
    assert "noopener" in html
    assert "employer.example" in html


def test_section_html_keys():
    sections = render_section_html(
        {
            "section_responsibilities": "Lead the team.",
            "section_benefits": "Medical aid.",
        }
    )
    assert "responsibilities" in sections
    assert "benefits" in sections
    assert "<" in sections["responsibilities"]
