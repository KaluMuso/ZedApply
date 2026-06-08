import os
import copy
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4
from fastapi.testclient import TestClient
import pytest
from tests.test_admin_jobs import JobsFakeSupabase, _valid_payload, _seed_job, _patch_embedding, auth_headers, jobs_fake, admin_client

def test_patch_full_form_payload(admin_client, auth_headers, jobs_fake):
    """Verify that PATCH accepts the new fields (experience_min_years, seniority_level,
    qualifications_required, parent_listing_signature) and responds with 200."""
    job_id = _seed_job(
        jobs_fake,
        experience_min_years=1,
        seniority_level="junior",
        qualifications_required=["Diploma"],
        parent_listing_signature="old-sig"
    )

    patch_payload = {
        "experience_min_years": 3,
        "seniority_level": "mid",
        "qualifications_required": ["Bachelor's Degree"],
        "parent_listing_signature": "new-sig-123"
    }

    # Since none of these metadata fields trigger re-embedding, generate_embedding won't be called.
    emb = AsyncMock(side_effect=AssertionError("embedding regen forbidden"))
    with patch("app.api.v1.admin.generate_embedding", emb):
        r = admin_client.patch(
            f"/api/v1/admin/jobs/{job_id}",
            json=patch_payload,
            headers=auth_headers,
        )

    assert r.status_code == 200, r.text
    body = r.json()

    # Verify response body returns updated values (Job response model must serialize them too)
    # Wait, let's verify if they are persisted in the fake database.
    row = jobs_fake.tables["jobs"][0]
    assert row["experience_min_years"] == 3
    # Mid-level gets normalized by _normalize_seniority validator
    assert row["seniority_level"] == "mid"
    assert row["qualifications_required"] == ["Bachelor's Degree"]
    assert row["parent_listing_signature"] == "new-sig-123"
