"""Pin migration 016's intent and structure.

Why a file-content test instead of a real DB test:
- This repo's pytest setup doesn't apply migrations against a live
  Postgres + pgvector instance — that's task #84's staging slice.
- However, the failure mode we want to prevent is exactly the kind of
  silent regression that bites in production: a future migration that
  drops one of the new columns, or a refactor that re-adds the SQL
  CHECK constraint we deliberately removed in #28.
- File-content assertions at least catch that in code review + CI
  without needing a DB.

When the staging environment is wired (task #84), the real integration
test will live there and this guard can stay as a belt-and-braces
defence.
"""
from pathlib import Path

MIGRATION_PATH = (
    Path(__file__).parent.parent.parent.parent
    / "infra"
    / "supabase"
    / "migrations"
    / "016_jobs_richer_schema.sql"
)


def _sql() -> str:
    return MIGRATION_PATH.read_text()


def test_migration_016_exists():
    assert MIGRATION_PATH.exists(), (
        f"Migration 016 missing at {MIGRATION_PATH}. The richer-jobs slice "
        "depends on it; without it the new columns aren't there to insert."
    )


def test_migration_016_uses_idempotent_add_column():
    """Re-running the migration must be safe. ADD COLUMN IF NOT EXISTS is
    the project-wide pattern (see migration 014's DROP/CREATE for the RPC
    equivalent)."""
    sql = _sql()
    # Every new column added uses IF NOT EXISTS — count > 0 is enough; the
    # specific column checks below pin the actual set.
    assert sql.count("ADD COLUMN IF NOT EXISTS") >= 12, (
        "Migration 016 must use ADD COLUMN IF NOT EXISTS so re-running on "
        "a partially-applied database doesn't error out."
    )


def test_migration_016_adds_all_expected_columns():
    """The new column list must match what's referenced in
    app/schemas/jobs.py JobCreate/Job. Drift here means /jobs ingest
    silently writes to a non-existent column.

    Update this list every time you touch JobCreate's new fields. The
    test fails loudly rather than letting a column quietly disappear.
    """
    sql = _sql()
    expected_columns = (
        "employment_type",
        "work_arrangement",
        "hybrid_days_per_week",
        "benefits",
        "tools_tech_stack",
        "application_instructions",
        "reporting_structure",
        "manages_others",
        "interview_process",
        "success_metrics",
        "company_description",
        "reference_number",
        "currency",
        "pay_frequency",
        "bonus_structure",
        "equity_offered",
    )
    for col in expected_columns:
        assert col in sql, (
            f"Migration 016 missing ADD COLUMN for {col!r}. The Pydantic "
            f"layer references this column; without it the row insert "
            f"will 23502/42703 at runtime."
        )


def test_migration_016_does_not_add_check_constraints():
    """Task #28 (migration 013) explicitly moved validation off DB CHECKs
    and onto Pydantic. Don't undo that — every enum value addition would
    otherwise require a migration."""
    sql = _sql()
    # Allow comment lines that MENTION 'check' (e.g. explaining why we
    # don't have one). Disallow real CHECK constraint declarations.
    real_check_re_count = sum(
        1
        for line in sql.splitlines()
        if "CHECK (" in line.upper() and not line.lstrip().startswith("--")
    )
    assert real_check_re_count == 0, (
        "Migration 016 introduces a SQL CHECK constraint. Per task #28 / "
        "migration 013, validation lives at the Pydantic layer. Remove the "
        "CHECK and rely on EmploymentType / WorkArrangement enum validation."
    )


def test_migration_016_is_wrapped_in_transaction():
    """BEGIN/COMMIT pairing ensures a partial failure rolls back instead
    of leaving the columns half-added. Mirrors migrations 014/015."""
    sql = _sql()
    assert "BEGIN;" in sql
    assert "COMMIT;" in sql
    assert sql.index("BEGIN;") < sql.index("COMMIT;"), (
        "BEGIN must precede COMMIT for the transaction to wrap the work."
    )


def test_migration_016_documents_each_column():
    """COMMENT ON COLUMN lets DBAs running \\d+ jobs see what each column
    is for without cross-referencing the Pydantic source. Pin that we
    don't quietly drop the comments in a future refactor."""
    sql = _sql()
    # One comment per major new column. We assert presence by column name
    # appearing in a COMMENT ON COLUMN line, which is enough to catch
    # accidental deletion.
    for col in (
        "employment_type",
        "work_arrangement",
        "benefits",
        "tools_tech_stack",
        "currency",
        "pay_frequency",
    ):
        assert f"COMMENT ON COLUMN public.jobs.{col}" in sql, (
            f"Migration 016 must document {col!r} via COMMENT ON COLUMN. "
            f"That's the only DB-visible explanation of what the column "
            f"is for."
        )
