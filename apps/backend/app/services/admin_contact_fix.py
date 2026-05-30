"""Admin bulk contact-fix queue helpers."""
from __future__ import annotations

from typing import Any

from app.services.job_apply_url_heuristics import is_aggregator


def job_needs_contact_fix(row: dict[str, Any]) -> bool:
    """True when an active job still needs manual apply/contact entry."""
    if not row.get("is_active", True):
        return False
    apply_url = (row.get("apply_url") or "").strip()
    if not apply_url or is_aggregator(apply_url):
        return True
    phone = (row.get("contact_phone") or "").strip()
    if not phone:
        return True
    return False


def scan_needs_contact_fix(
    rows: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    return [r for r in rows if job_needs_contact_fix(r)]
