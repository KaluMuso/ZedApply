"""Trusted-device login and OTP channel routing (bucket 8.5)."""
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, patch

import pytest

from app.services.otp import (
    SENSITIVE_ACTIONS,
    default_otp_channel_for_tier,
    hash_device_token,
    requires_otp_for_action,
    resolve_otp_channel,
)
from tests.conftest import FakeSupabaseQuery


class TestOtpHelpers:
    def test_sensitive_actions_set(self):
        assert SENSITIVE_ACTIONS == frozenset({
            "delete_account",
            "change_tier",
            "change_phone",
            "change_email",
            "export_data",
        })

    def test_requires_otp_for_sensitive_only(self):
        assert requires_otp_for_action("delete_account") is True
        assert requires_otp_for_action(None) is False
        assert requires_otp_for_action("login") is False

    def test_tier_default_channels(self):
        assert default_otp_channel_for_tier("free") == "email"
        assert default_otp_channel_for_tier("starter") == "whatsapp"
        assert default_otp_channel_for_tier(None) == "email"

    def test_resolve_channel_prefers_request(self):
        ch = resolve_otp_channel(
            user_row={"otp_channel_preference": "whatsapp"},
            tier="free",
            requested_channel="email",
        )
        assert ch == "email"


class TestTrustedDeviceLogin:
    @patch("app.api.v1.auth.is_device_trusted", return_value=True)
    @patch("app.api.v1.auth.lookup_user_auth_context")
    def test_login_skips_otp_when_trusted(
        self, mock_lookup, mock_trusted, client, fake_supabase
    ):
        mock_lookup.return_value = {
            "id": "user-trusted-1",
            "tier": "free",
            "email": "u@test.com",
            "otp_channel_preference": "email",
        }
        resp = client.post(
            "/api/v1/auth/login",
            json={"phone": "+260971234567"},
            headers={"X-Device-Token": "raw-device-token"},
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["trusted_device_login"] is True
        assert "access_token" in body

    @patch("app.api.v1.auth.lookup_user_auth_context")
    def test_login_unknown_user_needs_otp(self, mock_lookup, client):
        mock_lookup.return_value = None
        resp = client.post(
            "/api/v1/auth/login",
            json={"phone": "+260971234567"},
        )
        assert resp.status_code == 401


class TestOtpRequestChannels:
    @patch("app.api.v1.auth.send_otp", new_callable=AsyncMock)
    @patch("app.api.v1.auth.lookup_user_auth_context")
    def test_request_email_channel(self, mock_lookup, mock_send, client, fake_supabase):
        mock_lookup.return_value = {
            "id": "u1",
            "tier": "free",
            "email": "free@test.com",
            "otp_channel_preference": "email",
        }
        fake_supabase.set_table("otp_codes", FakeSupabaseQuery(data=[]))
        resp = client.post(
            "/api/v1/auth/otp/request",
            json={"phone": "+260971234567", "channel": "email"},
        )
        assert resp.status_code == 200
        assert "email" in resp.json()["message"].lower()
        mock_send.assert_awaited_once()
        assert mock_send.await_args.kwargs["channel"] == "email"


class TestVerifyRememberDevice:
    @patch("app.api.v1.auth.register_trusted_device")
    def test_verify_returns_device_token_when_remember(
        self, mock_register, client, fake_supabase
    ):
        fake_supabase.set_table(
            "otp_codes",
            FakeSupabaseQuery(
                data=[
                    {
                        "id": "otp-1",
                        "phone": "+260971234567",
                        "code": "123456",
                        "verified": False,
                        "attempts": 0,
                        "expires_at": "2099-12-31T00:00:00Z",
                    }
                ]
            ),
        )
        fake_supabase.set_table(
            "users",
            FakeSupabaseQuery(
                data=[{"id": "existing-uuid-9", "role": "user", "email": "e@t.com"}]
            ),
        )
        resp = client.post(
            "/api/v1/auth/otp/verify",
            json={
                "phone": "+260971234567",
                "code": "123456",
                "remember_device": True,
            },
        )
        assert resp.status_code == 200
        assert resp.json().get("device_token")
        mock_register.assert_called_once()


class TestTrustedDevicesTable:
    def test_hash_device_token_deterministic(self):
        assert hash_device_token("abc") == hash_device_token("abc")
        assert hash_device_token("abc") != hash_device_token("xyz")
