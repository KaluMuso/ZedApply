"""Smoke tests for auth OTP flow."""
from unittest.mock import AsyncMock, patch
from tests.conftest import FakeSupabaseQuery


class TestOTPRequest:
    def test_request_otp_success(self, client, fake_supabase):
        """OTP request succeeds for a fresh phone number."""
        fake_supabase.set_table("otp_codes", FakeSupabaseQuery(data=[]))
        with patch("app.api.v1.auth.send_whatsapp_otp", new_callable=AsyncMock) as mock_send:
            resp = client.post("/api/v1/auth/otp/request", json={"phone": "+260971234567"})
        assert resp.status_code == 200
        assert "OTP sent" in resp.json()["message"]
        mock_send.assert_called_once()

    def test_request_otp_cooldown(self, client, fake_supabase):
        """OTP request blocked when a recent code exists (cooldown)."""
        fake_supabase.set_table("otp_codes", FakeSupabaseQuery(
            data=[{"created_at": "2025-01-01T00:00:00Z"}]
        ))
        resp = client.post("/api/v1/auth/otp/request", json={"phone": "+260971234567"})
        assert resp.status_code == 429

    def test_request_otp_invalid_phone(self, client):
        """OTP request rejects phones that don't match +260 pattern."""
        resp = client.post("/api/v1/auth/otp/request", json={"phone": "0971234567"})
        assert resp.status_code == 422

    def test_request_otp_missing_phone(self, client):
        """OTP request rejects empty body."""
        resp = client.post("/api/v1/auth/otp/request", json={})
        assert resp.status_code == 422


class TestOTPVerify:
    def test_verify_otp_invalid_code(self, client, fake_supabase):
        """Verify rejects when no matching OTP found."""
        fake_supabase.set_table("otp_codes", FakeSupabaseQuery(data=[]))
        resp = client.post("/api/v1/auth/otp/verify", json={
            "phone": "+260971234567", "code": "123456"
        })
        assert resp.status_code == 401

    def test_verify_otp_success_new_user(self, client, fake_supabase):
        """Verify creates a new user when phone not found, returns tokens."""
        fake_supabase.set_table("otp_codes", FakeSupabaseQuery(data=[{
            "id": "otp-1", "phone": "+260971234567", "code": "123456",
            "verified": False, "attempts": 0,
        }]))
        # users table returns empty → triggers new user creation
        fake_supabase.set_table("users", FakeSupabaseQuery(data=[]))
        fake_supabase.set_table("subscriptions", FakeSupabaseQuery(data=[]))
        resp = client.post("/api/v1/auth/otp/verify", json={
            "phone": "+260971234567", "code": "123456"
        })
        assert resp.status_code == 200
        body = resp.json()
        assert "access_token" in body
        assert "refresh_token" in body
        assert "user_id" in body

    def test_verify_otp_too_many_attempts(self, client, fake_supabase):
        """Verify rejects after max OTP attempts."""
        fake_supabase.set_table("otp_codes", FakeSupabaseQuery(data=[{
            "id": "otp-1", "phone": "+260971234567", "code": "123456",
            "verified": False, "attempts": 5,
        }]))
        resp = client.post("/api/v1/auth/otp/verify", json={
            "phone": "+260971234567", "code": "123456"
        })
        assert resp.status_code == 401
        assert "Too many attempts" in resp.json()["detail"]
