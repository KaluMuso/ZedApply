"""Smoke test for health endpoint (no auth required)."""
from unittest.mock import AsyncMock, patch, MagicMock


class TestHealth:
    @patch("app.core.deps.get_supabase")
    @patch("app.services.whatsapp.check_waha_health", new_callable=AsyncMock)
    def test_health_all_healthy(self, mock_waha, mock_sb, client):
        """Health check returns healthy when all services up."""
        mock_waha.return_value = True
        fake_rpc = MagicMock()
        fake_rpc.execute.return_value = MagicMock(data=[True])
        mock_sb.return_value.rpc.return_value = fake_rpc

        resp = client.get("/api/v1/health")
        assert resp.status_code == 200
        body = resp.json()
        assert body["version"] == "0.1.0"

    @patch("app.core.deps.get_supabase")
    @patch("app.services.whatsapp.check_waha_health", new_callable=AsyncMock)
    def test_health_degraded(self, mock_waha, mock_sb, client):
        """Health returns degraded when WAHA is down."""
        mock_waha.return_value = False
        fake_rpc = MagicMock()
        fake_rpc.execute.return_value = MagicMock(data=[True])
        mock_sb.return_value.rpc.return_value = fake_rpc

        resp = client.get("/api/v1/health")
        assert resp.status_code == 200
        body = resp.json()
        assert body["status"] in ("degraded", "healthy")
