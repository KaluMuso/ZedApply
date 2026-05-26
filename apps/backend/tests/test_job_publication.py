"""Tests for public job visibility and scraping-source provenance."""
from __future__ import annotations

from app.services.job_publication import (
    compute_contact_is_active,
    has_apply_contact,
    is_publicly_listable,
)
from app.services.job_scraping_sources import infer_source_type, merge_scraping_sources


def test_infer_source_type_jobweb():
    assert infer_source_type("https://www.jobwebzambia.com/job/1") == "jobwebzambia"


def test_has_apply_contact_phone():
    assert has_apply_contact(contact_phone="+260971234567")


def test_compute_contact_is_active_admin_override():
    assert compute_contact_is_active(
        apply_url=None,
        apply_email=None,
        contact_phone=None,
        admin_published=True,
    )


def test_is_publicly_listable_requires_contact_or_override():
    assert is_publicly_listable(
        {
            "is_active": True,
            "is_review_required": False,
            "apply_url": "https://co.test/jobs/1",
        }
    )
    assert not is_publicly_listable(
        {
            "is_active": True,
            "is_review_required": False,
            "source_url": "https://jobwebzambia.com/x",
        }
    )
    assert is_publicly_listable(
        {
            "is_active": True,
            "is_review_required": False,
            "admin_published": True,
        }
    )


def test_merge_scraping_sources_dedupes_url():
    existing = [
        {
            "url": "https://jobwebzambia.com/job/1",
            "source_type": "jobwebzambia",
            "scraped_at": "2026-05-01T00:00:00Z",
        }
    ]
    merged = merge_scraping_sources(
        existing,
        "https://www.gozambiajobs.com/job/1",
    )
    assert len(merged) == 2
    again = merge_scraping_sources(merged, "https://jobwebzambia.com/job/1")
    assert len(again) == 2
