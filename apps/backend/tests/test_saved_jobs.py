"""Saved jobs bookmark routes."""
from tests.conftest import FakeSupabaseQuery


def test_list_saved_jobs_returns_ids(client, auth_headers, fake_supabase):
    fake_supabase.set_table(
        "saved_jobs",
        FakeSupabaseQuery(data=[{"job_id": "job-a"}, {"job_id": "job-b"}]),
    )
    resp = client.get("/api/v1/users/me/saved-jobs", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["job_ids"] == ["job-a", "job-b"]


def test_save_job_upserts_row(client, auth_headers, fake_supabase):
    fake_supabase.set_table("jobs", FakeSupabaseQuery(data=[{"id": "job-1"}]))
    fake_supabase.set_table("saved_jobs", FakeSupabaseQuery())
    resp = client.post("/api/v1/jobs/job-1/save", headers=auth_headers)
    assert resp.status_code == 201
    assert resp.json()["saved"] is True
    assert resp.json()["job_id"] == "job-1"


def test_save_job_404_when_missing(client, auth_headers, fake_supabase):
    fake_supabase.set_table("jobs", FakeSupabaseQuery(data=[]))
    resp = client.post("/api/v1/jobs/missing/save", headers=auth_headers)
    assert resp.status_code == 404


def test_unsave_job_returns_204(client, auth_headers, fake_supabase):
    fake_supabase.set_table("saved_jobs", FakeSupabaseQuery())
    resp = client.delete("/api/v1/jobs/job-1/save", headers=auth_headers)
    assert resp.status_code == 204
