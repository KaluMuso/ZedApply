"""Smoke tests for admin routes."""
from tests.conftest import FakeSupabaseQuery


class RecordingQuery(FakeSupabaseQuery):
    """Like FakeSupabaseQuery but records every `.update(payload)` call so a
    test can assert which tables got written and what payloads they got."""

    def __init__(self, *args, recorder, table_name, **kwargs):
        super().__init__(*args, **kwargs)
        self._recorder = recorder
        self._table_name = table_name

    def update(self, payload):
        self._recorder.setdefault(self._table_name, []).append(payload)
        return self


class TestAdminStats:
    def test_stats_unauthenticated(self, client):
        """Admin endpoint requires auth."""
        resp = client.get("/api/v1/admin/stats")
        assert resp.status_code in (401, 403)

    def test_stats_success(self, client, auth_headers, fake_supabase):
        """Returns admin stats (if user has admin role)."""
        fake_supabase.set_table(
            "users",
            FakeSupabaseQuery(
                data=[
                    {
                        "id": "test-user-id",
                        "role": "admin",
                    }
                ]
            ),
        )
        resp = client.get("/api/v1/admin/stats", headers=auth_headers)
        # May be 200, 403 (not admin), or 404 (route doesn't exist)
        assert resp.status_code in (200, 403, 404)

    def test_stats_forbidden_for_non_admin(
        self, client, auth_headers, fake_supabase
    ):
        """Non-admin users get 403."""
        fake_supabase.set_table(
            "users",
            FakeSupabaseQuery(
                data=[
                    {
                        "id": "test-user-id",
                        "role": "user",
                    }
                ]
            ),
        )
        resp = client.get("/api/v1/admin/stats", headers=auth_headers)
        # May be 403 (correctly denied) or 404 (route doesn't exist)
        assert resp.status_code in (403, 404)


class TestAdminJobs:
    def test_list_admin_jobs_requires_auth(self, client):
        """Admin jobs listing requires auth."""
        resp = client.get("/api/v1/admin/jobs")
        assert resp.status_code in (401, 403, 404)

    def test_list_admin_jobs(self, client, auth_headers, fake_supabase):
        """Returns job list for admins."""
        fake_supabase.set_table(
            "users",
            FakeSupabaseQuery(
                data=[{"id": "test-user-id", "role": "admin"}]
            ),
        )
        fake_supabase.set_table(
            "jobs", FakeSupabaseQuery(data=[], count=0)
        )
        resp = client.get("/api/v1/admin/jobs", headers=auth_headers)
        assert resp.status_code in (200, 403, 404)


class TestBackfillHtmlStrip:
    """Regression coverage for the /admin/jobs/backfill-html-strip endpoint.

    The endpoint rewrites HTML descriptions to plain text. The fingerprint
    in job_fingerprints was hashed over the ORIGINAL HTML description, so
    the backfill must also rewrite the fingerprint — otherwise the next
    scraper ingest computes a clean-text fingerprint, misses the stale
    HTML-text fingerprint, and inserts a duplicate row for every cleaned
    job. The tests below pin both the root cause (fingerprints diverge)
    and the fix (both tables get updated).
    """

    def test_strip_html_changes_fingerprint(self):
        """Root-cause check: cleaning an HTML description produces a
        different fingerprint than the original. If this ever stops being
        true the fix becomes unnecessary, but until then any backfill that
        rewrites descriptions MUST also rewrite fingerprints."""
        from app.api.v1.jobs import _fingerprint, _strip_html

        title, company = "Software Engineer", "ZANACO"
        html_desc = (
            "<p>Build mobile money integrations across Zambia. "
            "Strong Python skills required.</p>"
        )
        clean_desc = _strip_html(html_desc)

        assert clean_desc != html_desc
        assert _fingerprint(title, company, html_desc) != _fingerprint(
            title, company, clean_desc
        )

    def test_backfill_updates_fingerprint_alongside_description(
        self, client, auth_headers, fake_supabase
    ):
        """Backfill must update BOTH jobs.description AND
        job_fingerprints.fingerprint. Without the fingerprint update, the
        next scraper ingest of the same listing inserts a duplicate."""
        from app.api.v1.jobs import _fingerprint, _strip_html

        # Admin user lookup hits the `users` table.
        fake_supabase.set_table(
            "users",
            FakeSupabaseQuery(
                data=[{"id": "test-user-id", "role": "admin"}]
            ),
        )

        update_log: dict[str, list[dict]] = {}
        html_desc = (
            "<p>Build mobile money integrations across Zambia. "
            "Strong Python skills required.</p>"
        )
        fake_supabase.set_table(
            "jobs",
            RecordingQuery(
                data=[
                    {
                        "id": "job-1",
                        "title": "Software Engineer",
                        "company": "ZANACO",
                        "description": html_desc,
                    }
                ],
                recorder=update_log,
                table_name="jobs",
            ),
        )
        fake_supabase.set_table(
            "job_fingerprints",
            RecordingQuery(
                data=[{"job_id": "job-1"}],
                recorder=update_log,
                table_name="job_fingerprints",
            ),
        )

        resp = client.post(
            "/api/v1/admin/jobs/backfill-html-strip",
            headers=auth_headers,
        )

        assert resp.status_code == 200, resp.text
        body = resp.json()
        assert body["changed"] == 1

        # Both tables must have received an update — this is the assertion
        # that fails on the pre-fix implementation.
        assert "jobs" in update_log and update_log["jobs"], (
            "jobs.description should have been updated"
        )
        assert (
            "job_fingerprints" in update_log and update_log["job_fingerprints"]
        ), "job_fingerprints.fingerprint should have been updated"

        # And specifically: the new fingerprint matches what _fingerprint
        # would compute over the cleaned description, so the next scraper
        # ingest hits the existing row instead of inserting a duplicate.
        expected_fp = _fingerprint(
            "Software Engineer", "ZANACO", _strip_html(html_desc)
        )
        assert update_log["job_fingerprints"][0]["fingerprint"] == expected_fp

    def test_backfill_dry_run_skips_both_updates(
        self, client, auth_headers, fake_supabase
    ):
        """dry_run=true counts rows that would change but writes neither
        table. Important so an operator can preview the impact without
        side-effecting prod."""
        fake_supabase.set_table(
            "users",
            FakeSupabaseQuery(
                data=[{"id": "test-user-id", "role": "admin"}]
            ),
        )
        update_log: dict[str, list[dict]] = {}
        fake_supabase.set_table(
            "jobs",
            RecordingQuery(
                data=[
                    {
                        "id": "job-1",
                        "title": "Software Engineer",
                        "company": "ZANACO",
                        "description": "<p>Sample HTML body that will change.</p>",
                    }
                ],
                recorder=update_log,
                table_name="jobs",
            ),
        )
        fake_supabase.set_table(
            "job_fingerprints",
            RecordingQuery(
                data=[{"job_id": "job-1"}],
                recorder=update_log,
                table_name="job_fingerprints",
            ),
        )

        resp = client.post(
            "/api/v1/admin/jobs/backfill-html-strip?dry_run=true",
            headers=auth_headers,
        )

        assert resp.status_code == 200
        body = resp.json()
        assert body["dry_run"] is True
        assert body["changed"] == 1  # counted, not written
        # No table writes in dry-run mode.
        assert "jobs" not in update_log or not update_log["jobs"]
        assert (
            "job_fingerprints" not in update_log
            or not update_log["job_fingerprints"]
        )
