"""Tests for review queue auto-dismiss eligibility and admin endpoint."""
from __future__ import annotations

from app.services.review_queue_cleanup import (
    AUTO_DISMISS_REVIEW_REASONS,
    build_hidden_inactive_dismiss_patch,
    matches_hidden_inactive_dismiss,
)


class TestMatchesHiddenInactiveDismiss:
    def test_eligible_both_inactive(self):
        assert matches_hidden_inactive_dismiss(
            {
                "is_review_required": True,
                "admin_reviewed_at": None,
                "is_active": False,
                "review_reason": "both",
            }
        )

    def test_rejects_no_deadline(self):
        assert not matches_hidden_inactive_dismiss(
            {
                "is_review_required": True,
                "admin_reviewed_at": None,
                "is_active": False,
                "review_reason": "no_deadline",
            }
        )

    def test_rejects_still_active(self):
        assert not matches_hidden_inactive_dismiss(
            {
                "is_review_required": True,
                "admin_reviewed_at": None,
                "is_active": True,
                "review_reason": "both",
            }
        )

    def test_idempotent_already_reviewed(self):
        assert not matches_hidden_inactive_dismiss(
            {
                "is_review_required": False,
                "admin_reviewed_at": "2026-01-01T00:00:00Z",
                "is_active": False,
                "review_reason": "both",
            }
        )


class TestBuildPatch:
    def test_sets_auto_dismissed_reason(self):
        patch = build_hidden_inactive_dismiss_patch()
        assert patch["review_reason"] == "auto_dismissed_hidden"
        assert patch["is_review_required"] is False
        assert patch["admin_review_reason"] is None


class TestAutoDismissReasons:
    def test_reasons_frozen(self):
        assert AUTO_DISMISS_REVIEW_REASONS == frozenset({"both", "no_apply_path"})
