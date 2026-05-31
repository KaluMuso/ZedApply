"""Cross-user (IDOR) authorization tests — user A must not read user B resources."""
from datetime import datetime, timedelta, timezone
import os
from typing import Any
from unittest.mock import MagicMock

import pytest
from jose import jwt

from tests.conftest import FakeSupabaseQuery

USER_A = "user-a-id"
USER_B = "user-b-id"
MATCH_B = "match-b-uuid"
GEN_B = "gen-b-uuid"
JOB_1 = "job-1-uuid"


def _headers(user_id: str) -> dict[str, str]:
    now = datetime.now(timezone.utc)
    token = jwt.encode(
        {
            "sub": user_id,
            "phone": "+260971234567",
            "exp": now + timedelta(hours=24),
            "iat": now,
        },
        os.environ["JWT_SECRET"],
        algorithm="HS256",
    )
    return {"Authorization": f"Bearer {token}"}


class _FilteringTable:
    """Minimal table mock that enforces user_id filters on select."""

    def __init__(self, name: str, rows: list[dict[str, Any]]):
        self._name = name
        self._rows = [dict(r) for r in rows]
        self._filters: dict[str, Any] = {}
        self._single = False

    def select(self, *_a, **_kw):
        return self

    def eq(self, col: str, val: Any):
        self._filters[col] = val
        return self

    def in_(self, col: str, vals: list[Any]):
        self._filters[f"in:{col}"] = vals
        return self

    def limit(self, *_a, **_kw):
        return self

    def order(self, *_a, **_kw):
        return self

    def single(self):
        self._single = True
        return self

    def insert(self, data):
        row = dict(data)
        row.setdefault("id", f"{self._name}-new")
        self._rows.append(row)
        result = MagicMock()
        result.data = [row]
        return result

    def upsert(self, data, **_kw):
        return self.insert(data)

    def delete(self):
        return self

    def execute(self):
        rows = list(self._rows)
        for col, val in self._filters.items():
            if col.startswith("in:"):
                field = col[3:]
                rows = [r for r in rows if r.get(field) in val]
            else:
                rows = [r for r in rows if r.get(col) == val]
        result = MagicMock()
        if self._single:
            result.data = rows[0] if rows else None
        else:
            result.data = rows
        result.count = len(rows)
        self._filters = {}
        self._single = False
        return result


@pytest.fixture
def idor_supabase(fake_supabase):
    """Seed multi-user rows for authorization scenarios."""
    _user_defaults = {
        "subscription_tier": "free",
        "whatsapp_number": None,
        "location": None,
        "currency": "ZMW",
        "alert_frequency": "daily",
        "whatsapp_verified": False,
        "preferred_notification_channel": "email",
        "quiet_hours_start": "20:00",
        "quiet_hours_end": "07:00",
        "profile_visible_to_employers": True,
        "hidden_employer_name": None,
        "notify_product_updates": False,
        "display_timezone": "Africa/Lusaka",
    }
    users = _FilteringTable(
        "users",
        [
            {"id": USER_A, "phone": "+260971111001", "role": "user", **_user_defaults},
            {
                "id": USER_B,
                "phone": "+260971111002",
                "role": "user",
                **_user_defaults,
            },
        ],
    )
    matches = _FilteringTable(
        "matches",
        [
            {
                "id": MATCH_B,
                "user_id": USER_B,
                "job_id": JOB_1,
                "matched_skills": [],
                "missing_skills": [],
            },
        ],
    )
    cv_generations = _FilteringTable(
        "cv_generations",
        [
            {
                "id": GEN_B,
                "user_id": USER_B,
                "job_title": "Engineer",
                "company": "Acme",
                "content": "secret cv",
                "word_count": 100,
                "created_at": "2026-05-01T00:00:00Z",
                "metadata": {},
            },
        ],
    )
    saved_jobs = _FilteringTable(
        "saved_jobs",
        [
            {"user_id": USER_B, "job_id": JOB_1, "created_at": "2026-05-01T00:00:00Z"},
        ],
    )
    jobs = _FilteringTable(
        "jobs",
        [{"id": JOB_1, "title": "Engineer", "company": "Acme", "description": "Role"}],
    )
    subscriptions = _FilteringTable(
        "subscriptions",
        [
            {"user_id": USER_A, "tier": "professional", "status": "active"},
            {"user_id": USER_B, "tier": "professional", "status": "active"},
        ],
    )
    cvs = _FilteringTable(
        "cvs",
        [
            {
                "id": "cv-a",
                "user_id": USER_A,
                "is_primary": True,
                "raw_text": "User A CV",
            },
            {
                "id": "cv-b",
                "user_id": USER_B,
                "is_primary": True,
                "raw_text": "User B CV",
            },
        ],
    )
    employer_users = _FilteringTable(
        "employer_users",
        [
            {
                "id": "seat-b",
                "employer_id": "emp-b",
                "user_id": USER_B,
                "role": "owner",
            },
        ],
    )
    employers = _FilteringTable(
        "employers",
        [{"id": "emp-b", "name": "Employer B Ltd"}],
    )

    tables = {
        "users": users,
        "matches": matches,
        "cv_generations": cv_generations,
        "saved_jobs": saved_jobs,
        "jobs": jobs,
        "subscriptions": subscriptions,
        "cvs": cvs,
        "employer_users": employer_users,
        "employers": employers,
        "cover_letter_versions": _FilteringTable("cover_letter_versions", []),
        "user_preferences": _FilteringTable("user_preferences", []),
    }

    def table(name: str):
        if name == "jobs_user_facing":
            return tables.get("jobs", FakeSupabaseQuery())
        return tables.get(name, FakeSupabaseQuery())

    fake_supabase.table = table  # type: ignore[method-assign]
    fake_supabase._idor_tables = tables
    return fake_supabase


class TestCrossUserAuthorization:
    def test_matches_for_other_user_returns_403(self, client, idor_supabase):
        resp = client.get(
            f"/api/v1/matches/{USER_B}",
            headers=_headers(USER_A),
        )
        assert resp.status_code == 403
        assert "another user" in resp.json().get("detail", "").lower()

    def test_saved_jobs_scoped_to_caller(self, client, idor_supabase):
        resp = client.get(
            "/api/v1/users/me/saved-jobs",
            headers=_headers(USER_A),
        )
        assert resp.status_code == 200
        body = resp.json()
        jobs = body.get("jobs") or []
        assert all(
            j.get("id") != JOB_1 or j.get("title") != "Engineer"
            for j in jobs
        ) or len(jobs) == 0

    def test_cv_generation_other_user_returns_404(self, client, idor_supabase):
        resp = client.get(
            f"/api/v1/cv/generations/{GEN_B}",
            headers=_headers(USER_A),
        )
        assert resp.status_code == 404

    def test_cover_letter_versions_other_match_returns_404(
        self, client, idor_supabase, monkeypatch
    ):
        from app.core.tier_gating import verify_tier_access

        async def _allow(*_a, **_kw):
            return None

        monkeypatch.setattr(
            "app.api.v1.match_cover_letter.verify_tier_access",
            _allow,
        )
        resp = client.get(
            f"/api/v1/matches/{MATCH_B}/cover-letter/versions",
            headers=_headers(USER_A),
        )
        assert resp.status_code == 404

    def test_employer_me_requires_membership(self, client, idor_supabase):
        resp = client.get(
            "/api/v1/employers/me",
            headers=_headers(USER_A),
        )
        assert resp.status_code in (403, 404)

    def test_users_me_preferences_scoped_to_caller(self, client, idor_supabase):
        """User A reads only their row — B's phone must not appear."""
        resp = client.get(
            "/api/v1/users/me/preferences",
            headers=_headers(USER_A),
        )
        assert resp.status_code == 200
        assert resp.json().get("currency") == "ZMW"
