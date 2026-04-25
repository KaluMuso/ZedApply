"""Tests for the superadmin endpoints under /admin/*.

Each route is protected by `require_superadmin`, which calls back into
the users table to read `role`. The fake Supabase client is primed
per-test so the role check passes (or fails) deterministically.
"""
from tests.conftest import FakeSupabaseQuery


def _as_admin(fake_supabase, **extra_tables):
    """Prime users table so require_superadmin sees role=superadmin.

    extra_tables lets a test layer in additional tables (e.g. payments).
    """
    fake_supabase.set_table(
        "users",
        FakeSupabaseQuery(data=[{"id": "test-user-id", "phone": "+260971234567", "role": "superadmin"}]),
    )
    for name, query in extra_tables.items():
        fake_supabase.set_table(name, query)


def _as_user(fake_supabase):
    fake_supabase.set_table(
        "users",
        FakeSupabaseQuery(data=[{"id": "test-user-id", "phone": "+260971234567", "role": "user"}]),
    )


class TestAdminAuthorization:
    def test_stats_forbidden_for_non_admin(self, client, fake_supabase, auth_headers):
        _as_user(fake_supabase)
        resp = client.get("/api/v1/admin/stats", headers=auth_headers)
        assert resp.status_code == 403

    def test_users_forbidden_for_non_admin(self, client, fake_supabase, auth_headers):
        _as_user(fake_supabase)
        resp = client.get("/api/v1/admin/users", headers=auth_headers)
        assert resp.status_code == 403

    def test_stats_unauthenticated(self, client):
        resp = client.get("/api/v1/admin/stats")
        # FastAPI HTTPBearer returns 403 when no Authorization header is supplied
        assert resp.status_code in (401, 403)


class TestAdminStats:
    def test_returns_rpc_payload(self, client, fake_supabase, auth_headers):
        _as_admin(fake_supabase)
        # Override rpc to return a stats blob shaped like admin_stats() output.
        stats_blob = {
            "users_total": 10,
            "users_active_30d": 4,
            "subscriptions_active": 6,
            "subscriptions_paid": 2,
            "jobs_total": 50,
            "jobs_active": 40,
            "jobs_expired": 10,
            "matches_24h": 3,
            "matches_total": 25,
            "revenue_ngwee_30d": 50000,
            "revenue_ngwee_total": 200000,
        }
        fake_supabase.rpc = lambda *a, **kw: FakeSupabaseQuery(data=stats_blob)
        resp = client.get("/api/v1/admin/stats", headers=auth_headers)
        assert resp.status_code == 200
        body = resp.json()
        assert body["users_total"] == 10
        assert body["revenue_ngwee_30d"] == 50000


class TestAdminUsers:
    def test_returns_paginated_users(self, client, fake_supabase, auth_headers):
        _as_admin(
            fake_supabase,
            subscriptions=FakeSupabaseQuery(
                data=[{"user_id": "u1", "matches_used": 2, "matches_limit": 5}]
            ),
        )
        # users table is shared with the role check above, but list_users runs
        # a separate select so we override after `_as_admin`.
        fake_supabase.set_table(
            "users",
            FakeSupabaseQuery(
                data=[{"id": "test-user-id", "phone": "+260971234567", "role": "superadmin"}]
                + [
                    {
                        "id": "u1",
                        "phone": "+260977000001",
                        "full_name": "Test One",
                        "location": "Lusaka",
                        "subscription_tier": "mwana",
                        "role": "user",
                        "created_at": "2026-01-01T00:00:00Z",
                    }
                ],
                count=1,
            ),
        )
        resp = client.get("/api/v1/admin/users?page=1&per_page=10", headers=auth_headers)
        assert resp.status_code == 200
        body = resp.json()
        assert body["page"] == 1
        assert body["per_page"] == 10
        # users come back; the role-check row may bleed through but at least one user is present
        assert len(body["users"]) >= 1


class TestAdminJobs:
    def test_lists_jobs(self, client, fake_supabase, auth_headers):
        _as_admin(
            fake_supabase,
            jobs=FakeSupabaseQuery(
                data=[
                    {
                        "id": "j1",
                        "title": "Backend Engineer",
                        "company": "Acme",
                        "location": "Lusaka",
                        "source": "manual",
                        "quality_score": 80,
                        "is_active": True,
                        "closing_date": "2026-12-31",
                        "posted_at": "2026-04-01T00:00:00Z",
                    }
                ],
                count=1,
            ),
        )
        resp = client.get("/api/v1/admin/jobs", headers=auth_headers)
        assert resp.status_code == 200
        body = resp.json()
        assert body["total"] == 1
        assert body["jobs"][0]["title"] == "Backend Engineer"


class TestBulkDeactivate:
    def test_expired_only_uses_rpc(self, client, fake_supabase, auth_headers):
        _as_admin(fake_supabase)
        fake_supabase.rpc = lambda *a, **kw: FakeSupabaseQuery(data=7)
        resp = client.post(
            "/api/v1/admin/jobs/bulk-deactivate",
            headers=auth_headers,
            json={"expired_only": True},
        )
        assert resp.status_code == 200
        assert resp.json()["deactivated"] == 7

    def test_explicit_ids(self, client, fake_supabase, auth_headers):
        _as_admin(
            fake_supabase,
            jobs=FakeSupabaseQuery(data=[{"id": "j1"}, {"id": "j2"}]),
        )
        resp = client.post(
            "/api/v1/admin/jobs/bulk-deactivate",
            headers=auth_headers,
            json={"job_ids": ["j1", "j2"]},
        )
        assert resp.status_code == 200
        assert resp.json()["deactivated"] == 2

    def test_rejects_empty_payload(self, client, fake_supabase, auth_headers):
        _as_admin(fake_supabase)
        resp = client.post(
            "/api/v1/admin/jobs/bulk-deactivate",
            headers=auth_headers,
            json={},
        )
        assert resp.status_code == 422


class TestAdminPayments:
    def test_returns_payments_with_revenue(self, client, fake_supabase, auth_headers):
        _as_admin(
            fake_supabase,
            payments=FakeSupabaseQuery(
                data=[
                    {
                        "id": "p1",
                        "user_id": "u1",
                        "amount": 5000,
                        "currency": "ZMW",
                        "payment_method": "mtn",
                        "provider": "lenco",
                        "status": "completed",
                        "created_at": "2026-04-01T00:00:00Z",
                        "completed_at": "2026-04-01T00:01:00Z",
                    }
                ],
                count=1,
            ),
        )
        resp = client.get("/api/v1/admin/payments", headers=auth_headers)
        assert resp.status_code == 200
        body = resp.json()
        assert body["total"] == 1
        assert body["payments"][0]["payment_method"] == "mtn"
        # total_completed_ngwee sums the same shared payments fixture (5000)
        assert body["total_completed_ngwee"] == 5000
