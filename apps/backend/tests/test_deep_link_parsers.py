"""Tests for per-aggregator deep-link parsers (v2)."""
from pathlib import Path
from unittest.mock import AsyncMock, patch

import pytest

from app.services.deep_link_enricher import enrich_from_source_url
from app.services.deep_link_phone import extract_phones_from_text
from app.services.deep_link_parsers import (
    CONFIDENCE_UPDATE_THRESHOLD,
    PARSER_CONFIDENCE_THRESHOLDS,
    parse_with_registry,
    should_update_apply_url,
)
from app.services.deep_link_parsers.base import ApplyContact
from app.services.deep_link_parsers import (
    parse_gozambiajobs,
    parse_jobsearchzm,
    parse_jobwebzambia,
    parse_linkedin,
)
from app.services.deep_link_router import detect_parser_name, route_and_parse

_FIXTURES = Path(__file__).resolve().parent / "fixtures" / "deep_link"


def _fixture(name: str) -> str:
    return (_FIXTURES / name).read_text(encoding="utf-8")


class TestParseGozambiajobs:
    def test_parse_gozambiajobs_finds_mailto(self):
        html = """
        <html><body>
          <div class="application-method">
            <p>Send your CV to:</p>
            <a href="mailto:careers@acme.co.zm?subject=Application">Apply by email</a>
            <form action="https://acme.co.zm/apply"><input type="submit"></form>
          </div>
        </body></html>
        """
        result = parse_gozambiajobs(html, "https://gozambiajobs.com/jobs/1")
        assert result.apply_email == "careers@acme.co.zm"
        assert result.parser == "gozambiajobs"
        assert (result.parser_confidence or 0) >= CONFIDENCE_UPDATE_THRESHOLD

    def test_fixture_table_apply_row(self):
        html = _fixture("gozambiajobs_sample.html")
        result = parse_gozambiajobs(html, "https://gozambiajobs.com/jobs/99")
        assert result.apply_url == "https://acme.co.zm/careers/apply"
        assert result.parser_confidence >= 0.75


class TestParseJobwebzambia:
    def test_parse_jobwebzambia_finds_email_pattern(self):
        html = """
        <html><body>
          <section class="job-application">
            <p>Email: hr@zambianbank.co.zm</p>
            <p>Call +260 97 123 4567 for enquiries.</p>
          </section>
        </body></html>
        """
        result = parse_jobwebzambia(html, "https://jobwebzambia.com/job/42")
        assert result.apply_email == "hr@zambianbank.co.zm"
        assert result.contact_phone == "+260971234567"

    def test_fixture_apply_instructions(self):
        html = _fixture("jobwebzambia_sample.html")
        result = parse_jobwebzambia(html, "https://jobwebzambia.com/jobs/x")
        assert "workdaysite.com" in (result.apply_url or "")
        assert result.parser_confidence >= 0.75


class TestParseJobsearchzambia:
    def test_fixture_application_section(self):
        html = _fixture("jobsearchzambia_sample.html")
        result = parse_jobsearchzm(html, "https://jobsearchzambia.com/jobs/9")
        assert result.apply_email == "recruit@company.zm"
        assert result.apply_url == "https://company.zm/jobs/apply"


class TestParseCareersinafrica:
    def test_fixture_apply_button(self):
        from app.services.deep_link_parsers import careersinafrica

        html = _fixture("careersinafrica_sample.html")
        contact = careersinafrica.parse(
            html, "https://careersinafrica.com/jobs/zambia-analyst"
        )
        assert contact.apply_url == "https://employer.example/careers/vacancy-12"
        assert contact.parser_confidence >= PARSER_CONFIDENCE_THRESHOLDS["careersinafrica"]


class TestParseEverjobsZm:
    def test_fixture_apply_area(self):
        from app.services.deep_link_parsers import everjobs_zm

        html = _fixture("everjobs_zm_sample.html")
        contact = everjobs_zm.parse(html, "https://everjobs.com.zm/job/55")
        assert contact.apply_url == "https://miningcorp.zm/vacancies/lead-engineer"
        assert contact.apply_email == "ops@miningcorp.zm"


class TestParseLinkedin:
    @pytest.mark.asyncio
    async def test_parse_linkedin_redirects_to_employer_site(self):
        html = """
        <html><head>
          <meta property="og:see_also" content="https://employer.example/careers" />
        </head><body>LinkedIn job view</body></html>
        """
        linkedin_result = parse_linkedin(html, "https://www.linkedin.com/jobs/view/123")
        assert linkedin_result.redirect_url == "https://employer.example/careers"

        employer_html = """
        <html><body>
          <a href="mailto:jobs@employer.example">Apply</a>
        </body></html>
        """
        with patch(
            "app.services.deep_link_enricher.fetch_page",
            new_callable=AsyncMock,
            side_effect=[
                (200, "text/html", html),
                (200, "text/html", employer_html),
            ],
        ):
            result = await enrich_from_source_url(
                "https://www.linkedin.com/jobs/view/123"
            )
        assert result.apply_email == "jobs@employer.example"
        assert result.parser == "linkedin"


class TestContactPhoneExtraction:
    def test_contact_phone_extraction_zambia_format(self):
        phones = extract_phones_from_text(
            "Contact 0971234567 or +260971234567. Salary K12500. Closing 2024."
        )
        assert phones == ["+260971234567"]
        assert extract_phones_from_text("Posted in 1990 and 2024") == []
        assert extract_phones_from_text("Package worth 12500 ngwee") == []


class TestAggregatorRouter:
    def test_aggregator_router_picks_right_parser(self):
        assert detect_parser_name("https://www.gozambiajobs.com/job/1") == "gozambiajobs"
        assert detect_parser_name("https://jobwebzambia.com/x") == "jobwebzambia"
        assert detect_parser_name("https://jobsearchzambia.com/x") == "jobsearchzambia"
        assert detect_parser_name("https://jobsearchzm.com/x") == "jobsearchzambia"
        assert detect_parser_name("https://careersinafrica.com/x") == "careersinafrica"
        assert detect_parser_name("https://everjobs.com.zm/x") == "everjobs_zm"
        assert detect_parser_name("https://www.linkedin.com/jobs/view/1") == "linkedin"
        assert detect_parser_name("https://example.com/jobs/1") == "generic_fallback"

    def test_route_uses_jobsearchzm_apply_now_mailto(self):
        html = """
        <html><body>
          <a class="btn" href="mailto:recruit@company.zm">Apply Now</a>
        </body></html>
        """
        result = route_and_parse(html, "https://jobsearchzm.com/jobs/9")
        assert result.apply_email == "recruit@company.zm"
        assert result.parser == "jobsearchzambia"

    def test_route_falls_back_to_generic(self):
        html = "<html><body>Reach us at fallback@jobs.zm</body></html>"
        result = route_and_parse(html, "https://gozambiajobs.com/jobs/2")
        assert result.apply_email == "fallback@jobs.zm"

    def test_low_confidence_aggregator_link_not_updated(self):
        html = """
        <html><body>
          <a href="https://gozambiajobs.com/other-job">Apply</a>
        </body></html>
        """
        contact = parse_with_registry(html, "https://jobwebzambia.com/jobs/x")
        assert not should_update_apply_url(
            contact, original_url="https://jobwebzambia.com/jobs/x"
        )

    def test_should_update_with_external_url(self):
        contact = ApplyContact(
            apply_url="https://employer.example/apply",
            parser_confidence=0.9,
            parser_name="jobwebzambia",
        )
        assert should_update_apply_url(
            contact, original_url="https://jobwebzambia.com/jobs/x"
        )
