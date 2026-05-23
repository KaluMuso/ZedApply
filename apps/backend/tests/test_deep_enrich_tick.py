"""Tests for secondary deep-enrich cron tick."""
from unittest.mock import AsyncMock, patch

from main import app
from tests.conftest import FakeSupabaseQuery

INGEST_HEADERS = {"X-INGEST-API-KEY": "test-ingest-key"}
MOUNTED_PATH = "/api/v1/jobs/deep-enrich-tick"


def _deep_enrich_route_methods() -> set[str]:
    methods: set[str] = set()
    for route in app.routes:
        path = getattr(route, "path", "")
        if path == MOUNTED_PATH:
            methods |= set(getattr(route, "methods", set()) or set())
    return methods


def test_deep_enrich_tick_route_accepts_post(client):
    """Mounted app must expose POST on the n8n cron path (not only GET /{job_id})."""
    assert "POST" in _deep_enrich_route_methods()

    with patch(
        "app.api.v1.jobs.run_deep_enrich_tick",
        new_callable=AsyncMock,
        return_value={"processed": 0, "enriched": 0, "unchanged": 0},
    ):
        resp = client.post(f"{MOUNTED_PATH}?limit=50", headers=INGEST_HEADERS)

    assert resp.status_code != 405, resp.text
    assert resp.status_code == 200
    assert resp.json() == {"processed": 0, "enriched": 0, "unchanged": 0}


class TestDeepEnrichTick:
    def test_rejects_without_ingest_key(self, client):
        resp = client.post(MOUNTED_PATH)
        assert resp.status_code == 401

    @patch(
        "app.api.v1.jobs.run_deep_enrich_tick",
        new_callable=AsyncMock,
        return_value={"processed": 2, "enriched": 1, "unchanged": 1},
    )
    def test_deep_enrich_tick_with_ingest_key(self, mock_tick, client, fake_supabase):
        fake_supabase.set_table("jobs", FakeSupabaseQuery(data=[]))
        resp = client.post(
            f"{MOUNTED_PATH}?limit=10",
            headers=INGEST_HEADERS,
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body == {"processed": 2, "enriched": 1, "unchanged": 1}
        mock_tick.assert_awaited_once()
