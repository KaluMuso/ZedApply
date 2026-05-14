"""Pin the expired-jobs filter in migration 014.

Why a file-content test instead of a real DB test:
- The match_jobs_for_user RPC body lives in a SQL migration. The only
  way to truly verify the filter works is to apply 001-014 against a
  Postgres+pgvector instance and run a fixture, which isn't part of
  this repo's pytest setup.
- However, the failure mode we want to prevent is precisely the kind
  of regression that's easy to introduce by accident: a future migration
  that re-writes the RPC body and forgets to carry the filter clause
  forward (this happened in 007 to 009 with the type-cast bug — see
  009's "Carrier history" comment).
- A grep-style assertion against the migration file at least catches
  silent removal in code review + CI.
- When we add a staging environment (task #84), the real integration
  test will live there.
"""
from pathlib import Path


MIGRATION_PATH = (
    Path(__file__).parent.parent.parent.parent
    / "infra"
    / "supabase"
    / "migrations"
    / "014_filter_expired_from_matching.sql"
)


def test_migration_014_exists():
    assert MIGRATION_PATH.exists(), (
        f"Migration 014 missing at {MIGRATION_PATH}. The expired-jobs "
        "filter depends on it; without it the RPC still surfaces past-"
        "closing-date jobs in /matches."
    )


def test_migration_014_contains_expired_filter():
    """The WHERE clause must include the closing_date filter."""
    sql = MIGRATION_PATH.read_text()
    assert "j.closing_date IS NULL OR j.closing_date >= CURRENT_DATE" in sql, (
        "Migration 014 must include the closing_date filter clause. "
        "Without it, expired jobs surface on /matches. See the migration "
        "header comment for the user-visible failure mode."
    )


def test_migration_014_drops_function_first():
    """The migration must DROP FUNCTION IF EXISTS before CREATE so it's idempotent."""
    sql = MIGRATION_PATH.read_text()
    drop_idx = sql.find("DROP FUNCTION IF EXISTS public.match_jobs_for_user")
    create_idx = sql.find("CREATE FUNCTION public.match_jobs_for_user")
    assert drop_idx >= 0, "Missing DROP FUNCTION IF EXISTS — migration won't be idempotent"
    assert create_idx >= 0, "Missing CREATE FUNCTION — RPC won't be recreated"
    assert drop_idx < create_idx, (
        "DROP must come before CREATE so re-running the migration works"
    )


def test_migration_014_includes_stale_matches_cleanup():
    """The one-off DELETE for stale matches rows must be present."""
    sql = MIGRATION_PATH.read_text()
    assert "DELETE FROM public.matches" in sql, (
        "Stale matches cleanup missing. After 014 applies, old matches "
        "rows pointing at expired jobs would persist in users' history "
        "indefinitely unless this DELETE runs."
    )
    # Belt-and-braces: confirm the DELETE filters by closing_date
    assert "closing_date < CURRENT_DATE" in sql or \
           "closing_date < CURRENT_DATE - INTERVAL" in sql, (
        "Stale matches cleanup must scope by closing_date — otherwise it "
        "could wipe matches that are still valid."
    )


def test_migration_014_preserves_rpc_signature():
    """Signature must stay (UUID, REAL, INTEGER) → TABLE — same as 009.

    Changing the signature would break every caller in apps/backend/app/api/v1/matches.py.
    """
    sql = MIGRATION_PATH.read_text()
    assert "p_user_id    UUID" in sql
    assert "p_min_score  REAL    DEFAULT 50.0" in sql
    assert "p_limit      INTEGER DEFAULT 20" in sql
    # The 10 declared return columns must all still be there.
    for col in (
        "job_id          UUID",
        "job_title       TEXT",
        "job_company     TEXT",
        "job_location    TEXT",
        "vector_score    REAL",
        "skill_score     REAL",
        "bonus_score     REAL",
        "final_score     REAL",
        "matched_skills  TEXT[]",
        "missing_skills  TEXT[]",
    ):
        assert col in sql, f"Return column {col!r} missing — would break callers"
