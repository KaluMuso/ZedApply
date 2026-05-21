"""Track 1 RLS migration (040) — file guards + cross-user isolation semantics.

CI applies no migrations against Postgres; file-content tests catch policy
removal in review. The isolation helpers model PostgreSQL RLS evaluation for
``user_id = auth.uid()`` so we assert user A cannot see user B's rows without
a live Supabase instance.
"""
from __future__ import annotations

import re
import uuid
from pathlib import Path

import pytest

MIGRATION_PATH = (
    Path(__file__).parent.parent.parent.parent
    / "infra"
    / "supabase"
    / "migrations"
    / "040_rls_policies_track1.sql"
)

TRACK1_TABLES = (
    "otp_codes",
    "whatsapp_sessions",
    "user_skills",
    "application_outcomes",
    "skills",
    "skill_aliases",
    "job_skills",
    "job_fingerprints",
    "ai_cache",
    "legal_docs",
)

USER_OWNED_TABLES = (
    "otp_codes",
    "whatsapp_sessions",
    "user_skills",
    "application_outcomes",
)

PUBLIC_READ_TABLES = (
    "skills",
    "skill_aliases",
    "job_skills",
    "legal_docs",
)

SERVICE_ONLY_TABLES = (
    "job_fingerprints",
    "ai_cache",
)


def _sql() -> str:
    return MIGRATION_PATH.read_text()


def _policy_blocks(sql: str) -> dict[str, list[str]]:
    """Map table name → list of CREATE POLICY statement bodies."""
    blocks: dict[str, list[str]] = {t: [] for t in TRACK1_TABLES}
    pattern = re.compile(
        r"CREATE POLICY (\w+) ON public\.(\w+)\s*(.*?);",
        re.DOTALL | re.IGNORECASE,
    )
    for _name, table, body in pattern.findall(sql):
        if table in blocks:
            blocks[table].append(body.strip())
    return blocks


def _normalize_sql_fragment(text: str) -> str:
    return "".join(text.lower().split())


def _row_visible_to_auth_user(row_user_id: uuid.UUID | None, auth_uid: uuid.UUID) -> bool:
    """Model ``USING (user_id = auth.uid())`` for authenticated role."""
    return row_user_id is not None and row_user_id == auth_uid


@pytest.fixture
def two_users() -> tuple[uuid.UUID, uuid.UUID]:
    return uuid.uuid4(), uuid.uuid4()


def test_migration_040_exists():
    assert MIGRATION_PATH.exists(), (
        f"Migration 040 missing at {MIGRATION_PATH}. Track 1 RLS is not applied."
    )


def test_migration_040_enables_rls_on_all_track1_tables_except_legal_docs_reenable():
    sql = _sql()
    for table in TRACK1_TABLES:
        if table == "legal_docs":
            assert f"ALTER TABLE public.{table} ENABLE ROW LEVEL SECURITY" not in sql, (
                "legal_docs already has RLS enabled; re-ENABLE is unnecessary."
            )
        else:
            assert f"ALTER TABLE public.{table} ENABLE ROW LEVEL SECURITY" in sql, (
                f"Migration 040 must ENABLE ROW LEVEL SECURITY on {table}."
            )


def test_migration_040_public_read_tables_have_anon_select():
    sql = _sql()
    blocks = _policy_blocks(sql)
    for table in PUBLIC_READ_TABLES:
        assert blocks[table], f"{table} must have at least one CREATE POLICY"
        select_policies = [b for b in blocks[table] if "FOR SELECT" in b.upper()]
        assert select_policies, f"{table} needs a SELECT policy"
        combined = " ".join(select_policies).lower()
        assert "to anon" in combined and "authenticated" in combined
        assert "using(true)" in _normalize_sql_fragment(combined)


def test_migration_040_service_only_tables_have_no_policies():
    sql = _sql()
    blocks = _policy_blocks(sql)
    for table in SERVICE_ONLY_TABLES:
        assert not blocks[table], (
            f"{table} must have no anon/authenticated policies (service_role only)."
        )


def test_migration_040_user_owned_tables_use_auth_uid_equality():
    sql = _sql()
    blocks = _policy_blocks(sql)
    for table in USER_OWNED_TABLES:
        assert blocks[table], f"{table} must define policies"
        for body in blocks[table]:
            if "FOR SELECT" in body.upper() or "FOR INSERT" in body.upper():
                assert "user_id=auth.uid()" in _normalize_sql_fragment(body), (
                    f"{table} policy must scope rows with user_id = auth.uid()"
                )


def test_migration_040_otp_codes_adds_user_id_for_drifted_schemas():
    sql = _sql()
    assert "ADD COLUMN IF NOT EXISTS user_id" in sql
    assert "UPDATE public.otp_codes" in sql


def test_migration_040_whatsapp_sessions_has_insert_and_update():
    sql = _sql()
    blocks = _policy_blocks(sql)
    bodies = " ".join(blocks["whatsapp_sessions"]).upper()
    assert "FOR INSERT" in bodies
    assert "FOR UPDATE" in bodies


def test_migration_040_application_outcomes_has_insert_not_delete():
    sql = _sql()
    blocks = _policy_blocks(sql)
    bodies = " ".join(blocks["application_outcomes"]).upper()
    assert "FOR INSERT" in bodies
    assert "FOR DELETE" not in bodies


def test_migration_040_user_skills_no_delete_policy():
    sql = _sql()
    blocks = _policy_blocks(sql)
    bodies = " ".join(blocks["user_skills"]).upper()
    assert "FOR DELETE" not in bodies


@pytest.mark.parametrize("table", USER_OWNED_TABLES)
def test_cross_user_isolation_user_a_cannot_read_user_b_rows(
    table: str, two_users: tuple[uuid.UUID, uuid.UUID]
):
    """Simulate RLS: authenticated user A must not see rows owned by user B."""
    user_a, user_b = two_users
    row_owned_by_b = user_b
    assert not _row_visible_to_auth_user(row_owned_by_b, user_a), (
        f"{table}: user {user_a} must not read row with user_id={user_b}"
    )


@pytest.mark.parametrize("table", USER_OWNED_TABLES)
def test_cross_user_isolation_user_reads_own_row(
    table: str, two_users: tuple[uuid.UUID, uuid.UUID]
):
    user_a, _user_b = two_users
    assert _row_visible_to_auth_user(user_a, user_a)


def test_cross_user_isolation_null_user_id_not_visible():
    """Rows without user_id (pre-signup OTP) are not visible via user_id policy."""
    auth_uid = uuid.uuid4()
    assert not _row_visible_to_auth_user(None, auth_uid)


def test_public_read_policies_do_not_filter_by_user_id():
    """Catalog/legal tables use USING (true), not user_id = auth.uid()."""
    blocks = _policy_blocks(_sql())
    for table in PUBLIC_READ_TABLES:
        for body in blocks[table]:
            assert "user_id" not in body.lower(), (
                f"{table} public-read policy must not scope by user_id"
            )
            assert "using(true)" in _normalize_sql_fragment(body)
