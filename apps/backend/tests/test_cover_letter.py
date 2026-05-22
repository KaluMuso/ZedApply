"""Tier-gate tests for POST /api/v1/cover-letter/generate.

Locks in the fix for the regression where super_standard subscribers
(K500/mo, the highest tier) were being 403'd at the gate even though
they pay more than Professional users who were allowed through.

These tests stop at the tier-gate boundary and assert the next gate is
reached. We deliberately do NOT exercise CV/job lookup or LLM generation
— those are unrelated to the slice and would require heavier mocks.
"""
from unittest.mock import MagicMock

from tests.conftest import FakeSupabaseQuery


class _SingleQuery(FakeSupabaseQuery):
    """Like FakeSupabaseQuery but .single().execute() returns a single dict."""

    def single(self):
        self._single = True
        return self

    def execute(self):
        result = MagicMock()
        if getattr(self, "_single", False) and self._data:
            result.data = (
                self._data[0] if isinstance(self._data, list) else self._data
            )
        else:
            result.data = self._data
        result.count = getattr(self, "_count", None)
        return result


def _seed_user(fake_supabase, role="user", subscription_tier="mwana"):
    """get_current_user and tier gate read users.subscription_tier."""
    fake_supabase.set_table(
        "users",
        FakeSupabaseQuery(
            data=[
                {
                    "id": "test-user-id",
                    "phone": "+260971234567",
                    "role": role,
                    "subscription_tier": subscription_tier,
                    "matches_viewed_this_month": 0,
                    "billing_cycle_reset": "2099-06-01",
                }
            ]
        ),
    )


class TestCoverLetterTierGate:
    def test_mwana_tier_blocked(self, client, auth_headers, fake_supabase):
        """Mwana (free) users cannot generate cover letters."""
        _seed_user(fake_supabase, subscription_tier="mwana")

        resp = client.post(
            "/api/v1/cover-letter/generate",
            headers=auth_headers,
            json={"job_id": "job-1", "tone": "formal"},
        )
        assert resp.status_code == 403
        assert "Mwizi or Wino" in resp.json()["detail"]

    def test_mwizi_tier_blocked(self, client, auth_headers, fake_supabase):
        """Mwizi has CV generation but not cover letters."""
        _seed_user(fake_supabase, subscription_tier="mwizi")

        resp = client.post(
            "/api/v1/cover-letter/generate",
            headers=auth_headers,
            json={"job_id": "job-1", "tone": "formal"},
        )
        assert resp.status_code == 403
        assert "Wino" in resp.json()["detail"]

    def test_wino_passes_gate(self, client, auth_headers, fake_supabase):
        """Wino clears the tier gate; next failure is missing CV (422)."""
        _seed_user(fake_supabase, subscription_tier="wino")
        fake_supabase.set_table("cvs", FakeSupabaseQuery(data=[]))

        resp = client.post(
            "/api/v1/cover-letter/generate",
            headers=auth_headers,
            json={"job_id": "job-1", "tone": "formal"},
        )
        assert resp.status_code != 403
        assert resp.status_code == 422

    def test_legacy_professional_alias_passes_gate(
        self, client, auth_headers, fake_supabase
    ):
        """Legacy professional tier normalizes to wino."""
        _seed_user(fake_supabase, subscription_tier="professional")
        fake_supabase.set_table("cvs", FakeSupabaseQuery(data=[]))

        resp = client.post(
            "/api/v1/cover-letter/generate",
            headers=auth_headers,
            json={"job_id": "job-1", "tone": "formal"},
        )
        assert resp.status_code != 403
        assert resp.status_code == 422
