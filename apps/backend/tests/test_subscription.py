"""Smoke tests for subscription and payment routes."""
from unittest.mock import AsyncMock, MagicMock, patch
from tests.conftest import FakeSupabaseQuery


class _SingleQuery(FakeSupabaseQuery):
    """Mock that handles .single() by returning first item directly (not list)."""

    def single(self):
        """Supabase .single() returns one row dict, not a list."""
        self._single = True
        return self

    def execute(self):
        result = MagicMock()
        if getattr(self, "_single", False) and self._data:
            result.data = self._data[0] if isinstance(self._data, list) else self._data
        else:
            result.data = self._data
        result.count = getattr(self, "_count", None)
        return result


class TestGetSubscription:
    def test_get_subscription_unauthenticated(self, client):
        """Subscription endpoint requires auth."""
        resp = client.get("/api/v1/subscription")
        assert resp.status_code in (401, 403)

    def test_get_subscription_success(self, client, auth_headers, fake_supabase):
        """Returns subscription details."""
        fake_supabase.set_table("subscriptions", _SingleQuery(data=[{
            "id": "sub-1", "user_id": "test-user-id", "tier": "free",
            "matches_used": 2, "matches_limit": 5, "status": "active",
            "current_period_end": None,
        }]))
        resp = client.get("/api/v1/subscription", headers=auth_headers)
        assert resp.status_code == 200
        body = resp.json()
        assert body["tier"] == "free"
        assert body["matches_used"] == 2
        assert body["active"] is True


class TestPaymentInitiate:
    def test_pay_invalid_tier(self, client, auth_headers, fake_supabase):
        """Rejects payment for free tier."""
        resp = client.post("/api/v1/subscription/pay", headers=auth_headers, json={
            "tier": "free", "payment_method": "mtn", "phone": "+260971234567"
        })
        assert resp.status_code == 422

    @patch("app.services.dpo_pay.create_payment_token", new_callable=AsyncMock)
    def test_pay_success(self, mock_dpo, client, auth_headers, fake_supabase):
        """Payment initiation creates record and returns transaction_id."""
        fake_supabase.set_table("subscriptions", _SingleQuery(data=[{
            "id": "sub-1",
        }]))
        fake_supabase.set_table("payments", FakeSupabaseQuery(data=[{
            "id": "pay-001",
        }]))
        mock_dpo.return_value = {"token": "DPO-TOKEN-123", "redirect_url": "https://pay.example.com"}

        resp = client.post("/api/v1/subscription/pay", headers=auth_headers, json={
            "tier": "starter", "payment_method": "mtn", "phone": "+260971234567"
        })
        assert resp.status_code == 200
        body = resp.json()
        assert "transaction_id" in body
        assert "K125" in body["message"]
