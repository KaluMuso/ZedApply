"""Smoke tests for CV upload flow."""
import io
from unittest.mock import AsyncMock, patch
from tests.conftest import FakeSupabaseQuery


class TestCVUpload:
    def test_upload_rejects_unauthenticated(self, client):
        """CV upload requires auth token."""
        resp = client.post("/api/v1/cv/upload", files={
            "file": ("test.pdf", b"fake-pdf", "application/pdf")
        })
        assert resp.status_code in (401, 403)

    def test_upload_rejects_unsupported_type(self, client, auth_headers):
        """CV upload rejects unsupported file types."""
        resp = client.post("/api/v1/cv/upload",
            headers=auth_headers,
            files={"file": ("test.txt", b"just text", "text/plain")},
        )
        assert resp.status_code == 422
        assert "Unsupported file type" in resp.json()["detail"]

    def test_upload_rejects_oversized_file(self, client, auth_headers):
        """CV upload rejects files over 5MB."""
        big_file = b"x" * (5 * 1024 * 1024 + 1)
        resp = client.post("/api/v1/cv/upload",
            headers=auth_headers,
            files={"file": ("big.pdf", big_file, "application/pdf")},
        )
        assert resp.status_code == 422
        assert "too large" in resp.json()["detail"].lower()

    @patch("app.api.v1.cv.generate_embedding", new_callable=AsyncMock)
    @patch("app.api.v1.cv.parse_cv_with_llm", new_callable=AsyncMock)
    @patch("app.api.v1.cv.extract_text_from_file", new_callable=AsyncMock)
    def test_upload_success(self, mock_extract, mock_parse, mock_embed,
                            client, auth_headers, fake_supabase):
        """Full CV upload flow with mocked AI services."""
        mock_extract.return_value = "John Doe, Software Engineer with 5 years experience in Python, FastAPI, React..."
        mock_parse.return_value = {
            "full_name": "John Doe", "email": "john@example.com",
            "location": "Lusaka", "years_experience": 5,
            "skills": ["python", "fastapi", "react"],
            "experience_summary": "5 years in software development",
            "confidence": 0.92,
        }
        mock_embed.return_value = [0.1] * 1536

        fake_supabase.set_table("cvs", FakeSupabaseQuery(data=[{
            "id": "cv-001", "user_id": "test-user-id",
        }]))
        fake_supabase.set_table("skills", FakeSupabaseQuery(data=[
            {"id": "skill-1"}
        ]))
        fake_supabase.set_table("users", FakeSupabaseQuery(data=[]))

        resp = client.post("/api/v1/cv/upload",
            headers=auth_headers,
            files={"file": ("resume.pdf", b"fake-pdf-content", "application/pdf")},
        )
        assert resp.status_code == 200
        body = resp.json()
        assert "cv_id" in body
        assert "parsed_skills" in body
        assert body["parsing_confidence"] > 0

    @patch("app.api.v1.cv.extract_text_from_file", new_callable=AsyncMock)
    def test_upload_insufficient_text(self, mock_extract, client, auth_headers):
        """CV upload rejects when too little text extracted."""
        mock_extract.return_value = "short"
        resp = client.post("/api/v1/cv/upload",
            headers=auth_headers,
            files={"file": ("resume.pdf", b"fake-pdf", "application/pdf")},
        )
        assert resp.status_code == 422
        assert "enough text" in resp.json()["detail"].lower()
