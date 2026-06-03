"""Batch dismiss review-queue rows that are already hidden from customers."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Literal

# Review reasons safe to clear when the job is already inactive (no public path).
AUTO_DISMISS_REVIEW_REASONS: frozenset[str] = frozenset({"both", "no_apply_path"})

DismissMode = Literal["hidden_inactive"]


def build_hidden_inactive_dismiss_patch(
    *,
    reviewed_at: datetime | None = None,
) -> dict[str, Any]:
    """Patch applied when clearing review flags on already-hidden jobs."""
    ts = reviewed_at or datetime.now(timezone.utc)
    iso = ts.isoformat()
    return {
        "is_review_required": False,
        "review_reason": "auto_dismissed_hidden",
        "admin_review_reason": None,
        "admin_reviewed_at": iso,
        "updated_at": iso,
    }


def matches_hidden_inactive_dismiss(row: dict[str, Any]) -> bool:
    """True when a job row is eligible for bulk auto-dismiss (hidden backlog)."""
    if row.get("is_review_required") is not True:
        return False
    if row.get("admin_reviewed_at") is not None:
        return False
    if row.get("is_active") is not False:
        return False
    reason = row.get("review_reason")
    return reason in AUTO_DISMISS_REVIEW_REASONS
