"""Unit tests for admin contact-fix queue helpers."""
from __future__ import annotations

import pytest

from app.services.admin_contact_fix import job_needs_contact_fix, scan_needs_contact_fix


@pytest.mark.parametrize(
    "row,expected",
    [
        (
            {"is_active": True, "apply_url": None, "contact_phone": "+260971234567"},
            True,
        ),
        (
            {
                "is_active": True,
                "apply_url": "https://jobwebzambia.com/j/1",
                "contact_phone": "+260971234567",
            },
            True,
        ),
        (
            {
                "is_active": True,
                "apply_url": "https://employer.co.zm/apply",
                "contact_phone": None,
            },
            True,
        ),
        (
            {
                "is_active": True,
                "apply_url": "https://employer.co.zm/apply",
                "contact_phone": "+260971234567",
            },
            False,
        ),
        ({"is_active": False, "apply_url": None, "contact_phone": None}, False),
    ],
)
def test_job_needs_contact_fix(row: dict, expected: bool) -> None:
    assert job_needs_contact_fix(row) is expected


def test_scan_needs_contact_fix_filters_active_only() -> None:
    rows = [
        {
            "is_active": True,
            "apply_url": "https://employer.co.zm/apply",
            "contact_phone": "+260971234567",
        },
        {
            "is_active": True,
            "apply_url": None,
            "contact_phone": "+260971234567",
        },
    ]
    out = scan_needs_contact_fix(rows)
    assert len(out) == 1
    assert out[0]["apply_url"] is None
