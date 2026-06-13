"""Tests for tenders routes."""
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi import HTTPException
import pytest
from tests.conftest import FakeSupabaseQuery


class TestTendersMatches:
    def test_get_tenders_matches_unauthenticated(self, client):
        """Should return 401 or 403 when no auth headers are provided."""
        resp = client.get("/api/v1/tenders/matches")
        assert resp.status_code in (401, 403)

    @patch("app.api.v1.tenders.generate_embedding", new_callable=AsyncMock)
    def test_get_tenders_matches_profile_not_found(
        self, mock_embed, client, auth_headers, fake_supabase
    ):
        """Should return 404 when user has no business profile."""
        fake_supabase.set_table("business_profiles", FakeSupabaseQuery(data=[]))
        resp = client.get("/api/v1/tenders/matches", headers=auth_headers)
        assert resp.status_code == 404
        assert "Business profile not found" in resp.json()["detail"]

    @patch("app.api.v1.tenders.generate_embedding", new_callable=AsyncMock)
    def test_get_tenders_matches_success(
        self, mock_embed, client, auth_headers, fake_supabase
    ):
        """Should return matching tenders list on success."""
        mock_embed.return_value = [0.1] * 768
        
        # Mock profile
        fake_supabase.set_table(
            "business_profiles",
            FakeSupabaseQuery(
                data=[
                    {
                        "id": "test-user-id",
                        "company_name": "SME Builders Ltd",
                        "phone_number": "+260971234567",
                        "industry_tags": ["construction"],
                        "operating_provinces": ["Lusaka"],
                        "company_bio": "We build roads and bridges.",
                    }
                ]
            ),
        )

        # Mock the RPC call for match_tenders
        mock_rpc = MagicMock()
        mock_rpc.return_value.execute.return_value.data = [
            {
                "tender_id": "tender-1",
                "procuring_entity": "Ministry of Infrastructure",
                "title": "Lusaka Road Rehabilitation",
                "similarity": 0.82,
                "final_score": 78.5,
                "category": "Works",
                "province": "Lusaka",
                "closing_date": "2026-07-01T12:00:00Z",
                "source_url": "https://gppa.org.zm/tender/1",
                "requirements": "Grade 1 NCC certificate required.",
            }
        ]

        with patch.object(fake_supabase, "rpc", mock_rpc):
            resp = client.get("/api/v1/tenders/matches", headers=auth_headers)
            assert resp.status_code == 200
            data = resp.json()
            assert len(data) == 1
            assert data[0]["tender_id"] == "tender-1"
            assert data[0]["procuring_entity"] == "Ministry of Infrastructure"
            assert data[0]["final_score"] == 78.5


class TestTendersIngest:
    def test_ingest_tenders_unauthenticated(self, client):
        """Should return 401 when no auth header is provided."""
        resp = client.post("/api/v1/tenders/ingest", json={"tenders": []})
        assert resp.status_code == 401

    @patch("app.api.v1.tenders.generate_embedding", new_callable=AsyncMock)
    def test_ingest_tenders_success(
        self, mock_embed, client, fake_supabase
    ):
        """Should successfully ingest a new tender."""
        mock_embed.return_value = [0.2] * 768
        
        from app.core.config import get_settings
        settings = get_settings()
        # Override settings ingest API key
        settings.ingest_api_key = "test-ingest-key"
        headers = {"X-INGEST-API-KEY": "test-ingest-key"}

        # First query (duplicate check) returns empty data
        # Insert metadata returns mock tender
        # Insert embedding returns mock embedding
        fake_supabase.set_table("tenders", FakeSupabaseQuery(data=[]))
        fake_supabase.set_table("tender_embeddings", FakeSupabaseQuery(data=[]))

        payload = {
            "tenders": [
                {
                    "procuring_entity": "ZESCO",
                    "title": "Substation Equipment Supply",
                    "category": "Goods",
                    "description": "Supply of heavy-duty substation parts.",
                    "requirements": "Minimum 5 years OEM representation.",
                    "closing_date": "2026-08-15T12:00:00Z",
                    "province": "Lusaka",
                    "source_url": "https://gppa.org.zm/tender/substation",
                }
            ]
        }

        # We need to simulate:
        # 1. select.eq.eq.eq returns empty
        # 2. insert returns the created tender dict with id
        # Let's mock the methods on the returned query or use set_table with customized FakeSupabaseQuery
        mock_query = MagicMock()
        mock_query.select.return_value.eq.return_value.eq.return_value.eq.return_value.execute.return_value.data = []
        mock_query.insert.return_value.execute.return_value.data = [{"id": "tender-123"}]
        
        mock_embed_query = MagicMock()
        mock_embed_query.insert.return_value.execute.return_value.data = [{"id": "embedding-123"}]

        def table_side_effect(name):
            if name == "tenders":
                return mock_query
            elif name == "tender_embeddings":
                return mock_embed_query
            return FakeSupabaseQuery()

        with patch.object(fake_supabase, "table", side_effect=table_side_effect):
            resp = client.post("/api/v1/tenders/ingest", json=payload, headers=headers)
            assert resp.status_code == 200
            res_json = resp.json()
            assert res_json["ingested"] == 1
            assert res_json["duplicates"] == 0
            assert len(res_json["errors"]) == 0

    @patch("app.api.v1.tenders.generate_embedding", new_callable=AsyncMock)
    def test_ingest_tenders_duplicate(
        self, mock_embed, client, fake_supabase
    ):
        """Should skip duplicate tender and increment duplicate count."""
        from app.core.config import get_settings
        settings = get_settings()
        settings.ingest_api_key = "test-ingest-key"
        headers = {"X-INGEST-API-KEY": "test-ingest-key"}

        payload = {
            "tenders": [
                {
                    "procuring_entity": "ZESCO",
                    "title": "Substation Equipment Supply",
                    "category": "Goods",
                    "description": "Supply of heavy-duty substation parts.",
                    "requirements": "Minimum 5 years OEM representation.",
                    "closing_date": "2026-08-15T12:00:00Z",
                    "province": "Lusaka",
                    "source_url": "https://gppa.org.zm/tender/substation",
                }
            ]
        }

        # Simulate select finding a match
        mock_query = MagicMock()
        mock_query.select.return_value.eq.return_value.eq.return_value.eq.return_value.execute.return_value.data = [{"id": "existing-123"}]

        with patch.object(fake_supabase, "table", return_value=mock_query):
            resp = client.post("/api/v1/tenders/ingest", json=payload, headers=headers)
            assert resp.status_code == 200
            res_json = resp.json()
            assert res_json["ingested"] == 0
            assert res_json["duplicates"] == 1
            assert len(res_json["errors"]) == 0
            mock_embed.assert_not_called()

