"""Pin the tier gate on /interview-prep/generate.

Why this matters: the frontend hides the "Interview Call" button for users
below Super Standard (task #54 frontend tier-segregation pass), but the
button-hide is a UX nicety. The backend is the source of truth for the
gate. A determined user can still POST directly to the endpoint with any
JWT — these tests pin that the backend rejects every non-eligible tier.

The gate logic lives in apps/backend/app/api/v1/interview_prep.py — if
that's loosened (e.g. accidentally widened to "professional" or above),
this test fails loudly.
"""
from unittest.mock import patch
import pytest


# ---------- Fakes that simulate a real users + subscriptions table ----------


def _make_user_row(user_id: str = "test-user-id", role: str = "user") -> dict:
    return {"id": user_id, "phone": "+260971234567", "role": role}


def _make_sub_row(tier: str) -> dict:
    return {"user_id": "test-user-id", "tier": tier, "status": "active"}


class _FakeQuery:
    """Minimal supabase-py table-query mock returning prepared data."""

    def __init__(self, data):
        self._data = data

    def select(self, *_, **__):
        return self

    def eq(self, *_, **__):
        return self

    def limit(self, *_, **__):
        return self

    def execute(self):
        from types import SimpleNamespace
        return SimpleNamespace(data=self._data)


class _FakeSupabase:
    """Routes table('users') vs table('subscriptions') to different rows."""

    def __init__(self, user_role: str = "user", tier: str | None = None):
        self._user = _make_user_row(role=user_role)
        self._sub = _make_sub_row(tier) if tier else None

    def table(self, name: str):
        if name == "users":
            return _FakeQuery([self._user])
        if name == "subscriptions":
            return _FakeQuery([self._sub] if self._sub else [])
        return _FakeQuery([])


# ---------- The tier-gate tests ----------


@pytest.mark.parametrize("tier", ["free", "starter", "professional"])
def test_non_super_standard_tier_is_rejected(client, auth_headers, tier):
    """A user on any tier below super_standard gets a 403.

    The 403 must come from the tier check, not from a downstream LLM call
    (no Gemini key needed in test env).
    """
    from app.core.deps import get_supabase
    from main import app

    app.dependency_overrides[get_supabase] = lambda: _FakeSupabase(tier=tier)
    try:
        resp = client.post(
            "/api/v1/interview-prep/generate",
            headers=auth_headers,
            json={"job_id": "some-job-id"},
        )
    finally:
        app.dependency_overrides.pop(get_supabase, None)

    assert resp.status_code == 403, (
        f"Tier {tier!r} should be rejected, got {resp.status_code}: {resp.text[:200]}"
    )
    body = resp.json()
    assert "super standard" in body.get("detail", "").lower()


def test_user_without_active_subscription_is_rejected(client, auth_headers):
    """No active subscription row → treated as 'free' → 403."""
    from app.core.deps import get_supabase
    from main import app

    app.dependency_overrides[get_supabase] = lambda: _FakeSupabase(tier=None)
    try:
        resp = client.post(
            "/api/v1/interview-prep/generate",
            headers=auth_headers,
            json={"job_id": "some-job-id"},
        )
    finally:
        app.dependency_overrides.pop(get_supabase, None)

    assert resp.status_code == 403


def test_superadmin_bypasses_tier_gate(client, admin_headers):
    """Superadmin role should bypass the tier check entirely.

    We don't assert 200 here because the request still has to find a CV
    and a job — neither are set up. We only assert it gets past the tier
    check, which means anything other than 403-with-tier-message.
    """
    from app.core.deps import get_supabase
    from main import app

    # superadmin role, no subscription needed
    fake = _FakeSupabase(user_role="superadmin", tier=None)
    app.dependency_overrides[get_supabase] = lambda: fake
    try:
        resp = client.post(
            "/api/v1/interview-prep/generate",
            headers=admin_headers,
            json={"job_id": "some-job-id"},
        )
    finally:
        app.dependency_overrides.pop(get_supabase, None)

    # Past the tier gate — either downstream 404 (no CV/job) or 503/500
    # from a missing service. The only thing we MUST NOT see is the
    # tier-rejection message.
    if resp.status_code == 403:
        assert "super standard" not in resp.json().get("detail", "").lower(), (
            "Superadmin should not be tier-gated"
        )
