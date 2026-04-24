"""Smoke tests for matching trigger and retrieval."""
from unittest.mock import AsyncMock, patch
from tests.conftest import FakeSupabaseQuery


class TestMatchTrigger:
    def test_trigger_unauthenticated(self, client):
        """Match trigger requires auth."""
        resp = client.post("/api/v1/matches/trigger")
        assert resp.status_code == 401

    @patch("app.api.v1.matches.check_match_quota", new_callable=AsyncMock)
    def test_trigger_no_cv(self, mock_quota, client, auth_headers, fake_supabase):
        """Match trigger fails when no CV uploaded."""
        mock_quota.return_value = (True, 5)
        # get_current_user does a DB lookup — mock the users table
        fake_supabase.set_table("users", FakeSupabaseQuery(data=[
            {"id": "test-user-id", "phone": "+260971234567", "role": "user"}
        ]))
        fake_supabase.set_table("cvs", FakeSupabaseQuery(data=[]))
        resp = client.post("/api/v1/matches/trigger", headers=auth_headers)
        assert resp.status_code == 422
        assert "Upload a CV" in resp.json()["detail"]

    @patch("app.api.v1.matches.check_match_quota", new_callable=AsyncMock)
    def test_trigger_quota_exceeded(self, mock_quota, client, auth_headers, fake_supabase):
        """Match trigger blocked when quota is zero."""
        mock_quota.return_value = (False, 0)
        fake_supabase.set_table("users", FakeSupabaseQuery(data=[
            {"id": "test-user-id", "phone": "+260971234567", "role": "user"}
        ]))
        resp = client.post("/api/v1/matches/trigger", headers=auth_headers)
        assert resp.status_code == 403
        assert "quota" in resp.json()["detail"].lower()

    @patch("app.api.v1.matches._run_matching_task", new_callable=AsyncMock)
    @patch("app.api.v1.matches.check_match_quota", new_callable=AsyncMock)
    def test_trigger_success(self, mock_quota, mock_task, client, auth_headers, fake_supabase):
        """Match trigger starts background task when CV exists and quota available."""
        mock_quota.return_value = (True, 4)
        fake_supabase.set_table("users", FakeSupabaseQuery(data=[
            {"id": "test-user-id", "phone": "+260971234567", "role": "user"}
        ]))
        fake_supabase.set_table("cvs", FakeSupabaseQuery(data=[{"id": "cv-1"}]))
        resp = client.post("/api/v1/matches/trigger", headers=auth_headers)
        assert resp.status_code == 200
        assert "Matching started" in resp.json()["message"]

    @patch("app.api.v1.matches._run_matching_task", new_callable=AsyncMock)
    def test_trigger_superadmin_bypasses_quota(self, mock_task, client, auth_headers, fake_supabase):
        """Superadmin bypasses quota check entirely."""
        fake_supabase.set_table("users", FakeSupabaseQuery(data=[
            {"id": "test-user-id", "phone": "+260971234567", "role": "superadmin"}
        ]))
        fake_supabase.set_table("cvs", FakeSupabaseQuery(data=[{"id": "cv-1"}]))
        resp = client.post("/api/v1/matches/trigger", headers=auth_headers)
        assert resp.status_code == 200


class TestMatchList:
    @patch("app.api.v1.matches.check_match_quota", new_callable=AsyncMock)
    def test_get_matches_empty(self, mock_quota, client, auth_headers, fake_supabase):
        """Returns empty match list."""
        mock_quota.return_value = (True, 5)
        fake_supabase.set_table("matches", FakeSupabaseQuery(data=[]))
        resp = client.get("/api/v1/matches", headers=auth_headers)
        assert resp.status_code == 200
        body = resp.json()
        assert body["matches"] == []
        assert body["remaining_quota"] == 5
