"""Integration test: /cv/upload routes parsed skills through the
hybrid resolver so duplicates collapse to one user_skills row.

The acceptance criterion from the task spec:
    A CV with "postgresql" + "postgres" + "Postgres" produces 1
    user_skills row, not 3.

We assert this end-to-end by mocking the LLM parser to return three
duplicate names and stubbing the resolver to return one canonical id
for all of them. Then we confirm user_skills.upsert was called with
exactly one row, not three.
"""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from tests.conftest import FakeSupabase, FakeSupabaseQuery


def _mime_for_pdf(_bytes):
    return "application/pdf"


class _RecordingQuery(FakeSupabaseQuery):
    """FakeSupabaseQuery that records the last `.upsert()` payload so
    the test can assert how many user_skills rows were submitted."""

    def __init__(self, **kw):
        super().__init__(**kw)
        self.last_upsert_payload = None
        self.upsert_call_count = 0

    def upsert(self, data, **kw):
        self.last_upsert_payload = data
        self.upsert_call_count += 1
        return self


@patch("app.api.v1.cv._sniff_mime", side_effect=_mime_for_pdf)
@patch("app.api.v1.cv.generate_embedding", new_callable=AsyncMock)
@patch("app.api.v1.cv.parse_cv_with_llm", new_callable=AsyncMock)
@patch("app.api.v1.cv.extract_text_from_file", new_callable=AsyncMock)
@patch("app.api.v1.cv.resolve_skill_ids", new_callable=AsyncMock)
def test_upload_collapses_postgres_aliases_to_one_user_skill_row(
    mock_resolve,
    mock_extract,
    mock_parse,
    mock_embed,
    mock_sniff,
    client,
    auth_headers,
    fake_supabase,
):
    """Three input names that all canonicalize to the same skill must
    produce exactly one user_skills upsert row.

    The resolver is the unit under test in skill_resolver tests; here
    we trust it and assert the cv.py call site uses its output."""
    mock_extract.return_value = (
        "John Doe — 5 years backend experience with PostgreSQL, Postgres, "
        "and adjacent tooling. Has shipped production systems."
    )
    mock_parse.return_value = {
        "full_name": "John Doe",
        "skills": ["postgresql", "postgres", "Postgres"],
        "experience_summary": "5 years backend development",
        "confidence": 0.85,
    }
    mock_embed.return_value = [0.1] * 768
    # The resolver collapses three duplicates to one canonical id.
    mock_resolve.return_value = ["sk-pg-canonical"]

    fake_supabase.set_table(
        "cvs",
        FakeSupabaseQuery(
            data=[
                {"id": "cv-001", "user_id": "test-user-id", "file_url": "x.pdf"}
            ]
        ),
    )
    user_skills_q = _RecordingQuery(data=[])
    fake_supabase.set_table("user_skills", user_skills_q)

    resp = client.post(
        "/api/v1/cv/upload",
        headers=auth_headers,
        files={"file": ("resume.pdf", b"fake-pdf-content", "application/pdf")},
    )
    assert resp.status_code == 200, resp.text

    # Resolver got the three raw names.
    mock_resolve.assert_awaited_once()
    args, kwargs = mock_resolve.await_args
    assert args[0] == ["postgresql", "postgres", "Postgres"]
    assert kwargs["source"] == "cv_upload"
    assert kwargs["user_id"] == "test-user-id"

    # user_skills.upsert got exactly one row — the resolver collapsed
    # three duplicates into one canonical id.
    assert user_skills_q.upsert_call_count == 1
    payload = user_skills_q.last_upsert_payload
    assert isinstance(payload, list)
    assert len(payload) == 1
    assert payload[0]["skill_id"] == "sk-pg-canonical"
    assert payload[0]["source"] == "cv_parse"


@patch("app.api.v1.cv._sniff_mime", side_effect=_mime_for_pdf)
@patch("app.api.v1.cv.generate_embedding", new_callable=AsyncMock)
@patch("app.api.v1.cv.parse_cv_with_llm", new_callable=AsyncMock)
@patch("app.api.v1.cv.extract_text_from_file", new_callable=AsyncMock)
@patch("app.api.v1.cv.resolve_skill_ids", new_callable=AsyncMock)
def test_upload_empty_skill_list_skips_user_skills_upsert(
    mock_resolve,
    mock_extract,
    mock_parse,
    mock_embed,
    mock_sniff,
    client,
    auth_headers,
    fake_supabase,
):
    """When the LLM returns no skills, cv.py must NOT call the resolver
    or the user_skills upsert path — saves a useless DB round trip."""
    # cv.py requires >= 50 chars of extracted text or it 422s.
    mock_extract.return_value = (
        "Jane Doe — barebones CV with no extractable skills section."
    )
    mock_parse.return_value = {
        "skills": [],
        "experience_summary": "",
        "confidence": 0.5,
    }
    mock_embed.return_value = [0.1] * 768

    fake_supabase.set_table(
        "cvs",
        FakeSupabaseQuery(
            data=[
                {"id": "cv-002", "user_id": "test-user-id", "file_url": "x.pdf"}
            ]
        ),
    )
    user_skills_q = _RecordingQuery(data=[])
    fake_supabase.set_table("user_skills", user_skills_q)

    resp = client.post(
        "/api/v1/cv/upload",
        headers=auth_headers,
        files={"file": ("resume.pdf", b"fake-pdf-content", "application/pdf")},
    )
    assert resp.status_code == 200, resp.text
    mock_resolve.assert_not_awaited()
    assert user_skills_q.upsert_call_count == 0


@patch("app.api.v1.cv._sniff_mime", side_effect=_mime_for_pdf)
@patch("app.api.v1.cv.generate_embedding", new_callable=AsyncMock)
@patch("app.api.v1.cv.parse_cv_with_llm", new_callable=AsyncMock)
@patch("app.api.v1.cv.extract_text_from_file", new_callable=AsyncMock)
@patch("app.api.v1.cv.resolve_skill_ids", new_callable=AsyncMock)
def test_upload_resolver_returns_no_ids_skips_user_skills(
    mock_resolve,
    mock_extract,
    mock_parse,
    mock_embed,
    mock_sniff,
    client,
    auth_headers,
    fake_supabase,
):
    """If every skill failed to resolve (e.g., all empty strings), the
    upsert call must be skipped — we don't want an empty list passed to
    PostgREST."""
    mock_extract.return_value = (
        "Some CV text long enough to clear the 50-character minimum gate."
    )
    mock_parse.return_value = {
        "skills": ["   ", "", "   "],
        "experience_summary": "",
        "confidence": 0.5,
    }
    mock_embed.return_value = [0.1] * 768
    mock_resolve.return_value = []  # resolver dropped all empties

    fake_supabase.set_table(
        "cvs",
        FakeSupabaseQuery(
            data=[
                {"id": "cv-003", "user_id": "test-user-id", "file_url": "x.pdf"}
            ]
        ),
    )
    user_skills_q = _RecordingQuery(data=[])
    fake_supabase.set_table("user_skills", user_skills_q)

    resp = client.post(
        "/api/v1/cv/upload",
        headers=auth_headers,
        files={"file": ("resume.pdf", b"fake-pdf-content", "application/pdf")},
    )
    assert resp.status_code == 200, resp.text
    assert user_skills_q.upsert_call_count == 0
