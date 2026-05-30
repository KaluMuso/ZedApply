"""Tests for renewal reminder emails and Lenco webhook Sentry alerts."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from tests.conftest import FakeSupabaseQuery


class TestRenewalReminders:
    @pytest.mark.asyncio
    async def test_sends_for_subscriptions_ending_in_three_days(self, fake_supabase):
        from app.services.renewal_reminders import run_renewal_reminder_emails

        period_end = datetime.now(timezone.utc) + timedelta(days=3)
        fake_supabase.set_table(
            "subscriptions",
            FakeSupabaseQuery(
                data=[
                    {
                        "user_id": "user-renew-1",
                        "tier": "starter",
                        "current_period_end": period_end.isoformat(),
                        "cancelled_at": None,
                    }
                ]
            ),
        )
        fake_supabase.set_table("billing_email_log", FakeSupabaseQuery(data=[]))
        fake_supabase.set_table("tier_config", FakeSupabaseQuery(data=[]))

        with patch(
            "app.services.renewal_reminders.send_renewal_reminder_email",
            new_callable=AsyncMock,
        ) as mock_send:
            mock_send.return_value = True
            stats = await run_renewal_reminder_emails(fake_supabase)

        assert stats["sent"] == 1
        mock_send.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_skips_already_sent(self, fake_supabase):
        from app.services.renewal_reminders import run_renewal_reminder_emails

        period_end = datetime.now(timezone.utc) + timedelta(days=3)
        fake_supabase.set_table(
            "subscriptions",
            FakeSupabaseQuery(
                data=[
                    {
                        "user_id": "user-renew-2",
                        "tier": "professional",
                        "current_period_end": period_end.isoformat(),
                        "cancelled_at": None,
                    }
                ]
            ),
        )
        fake_supabase.set_table(
            "billing_email_log",
            FakeSupabaseQuery(
                data=[
                    {
                        "user_id": "user-renew-2",
                        "kind": "email_renewal_reminder",
                        "period_end": period_end.date().isoformat(),
                    }
                ]
            ),
        )
        fake_supabase.set_table("tier_config", FakeSupabaseQuery(data=[]))

        with patch(
            "app.services.renewal_reminders.send_renewal_reminder_email",
            new_callable=AsyncMock,
        ) as mock_send:
            stats = await run_renewal_reminder_emails(fake_supabase)

        assert stats["skipped"] == 1
        assert stats["sent"] == 0
        mock_send.assert_not_awaited()


class TestLencoWebhookSentryAlerts:
    def test_report_failure_captures_sentry_message(self, monkeypatch):
        from app.services.lenco_webhook import report_lenco_webhook_failure

        capture_calls: list[tuple] = []

        class FakeScope:
            fingerprint = None

            def set_tag(self, *args, **kwargs):
                pass

            def set_context(self, *args, **kwargs):
                pass

            def __enter__(self):
                return self

            def __exit__(self, *args):
                pass

        fake_sdk = MagicMock()
        fake_sdk.new_scope.return_value = FakeScope()

        def _capture(message, level="warning"):
            capture_calls.append((message, level))

        fake_sdk.capture_message = _capture
        monkeypatch.setattr("sentry_sdk.new_scope", fake_sdk.new_scope)
        monkeypatch.setattr(
            "sentry_sdk.capture_message",
            fake_sdk.capture_message,
        )
        monkeypatch.setattr(
            "sentry_sdk.add_breadcrumb",
            lambda *a, **k: None,
        )

        report_lenco_webhook_failure(
            "lenco_webhook_invalid_signature",
            {"event": "collection.successful", "data": {"reference": "zedapply-abc1234"}},
            level="warning",
        )
        assert capture_calls
        assert "invalid_signature" in capture_calls[0][0]

    def test_webhook_invalid_signature_triggers_sentry(self, client, fake_supabase, monkeypatch):
        from app.core.config import get_settings

        get_settings.cache_clear()
        monkeypatch.setenv("LENCO_API_KEY", "test-key")

        with patch(
            "app.services.lenco_webhook.report_lenco_webhook_failure"
        ) as mock_report:
            resp = client.post(
                "/api/v1/webhooks/lenco",
                headers={
                    "x-lenco-signature": "deadbeef" * 16,
                    "Content-Type": "application/json",
                },
                content=b'{"event":"collection.successful"}',
            )
            assert resp.status_code == 401
            mock_report.assert_called_once()
            assert mock_report.call_args[0][0] == "lenco_webhook_invalid_signature"
