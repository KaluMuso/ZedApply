"""Tests for scripts/backfill_canonicalize_job_skills.py.

The script's hot path is `_canonicalize_table` — the rest is argparse +
client setup. We test it directly with a stub supabase + a stub resolver
so the test runs offline and deterministically.

What we verify:
- A row whose skill's canonical id matches its current skill_id is left
  alone (the "unchanged" count goes up).
- A row whose skill maps to a DIFFERENT canonical id is rewritten —
  produces the same skill_id assignment a fresh upload would.
- When the canonical id is already present on the same parent (i.e.
  duplicates would conflict on PK), the non-canonical row is deleted
  instead of erroring.
- Dry-run mode reports the same counts but writes nothing.
"""

from __future__ import annotations

import asyncio
import importlib.util
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
SCRIPT_PATH = REPO_ROOT / "scripts" / "backfill_canonicalize_job_skills.py"


def _load_script_module():
    """Load the backfill script as a module without executing main()."""
    spec = importlib.util.spec_from_file_location(
        "backfill_canonicalize_job_skills", SCRIPT_PATH
    )
    mod = importlib.util.module_from_spec(spec)  # type: ignore[arg-type]
    assert spec is not None and spec.loader is not None
    spec.loader.exec_module(mod)  # type: ignore[union-attr]
    return mod


# ── Stub supabase that tracks state across the join + writes ─────────


class _Query:
    """One query builder per .table() call. Supports the exact chain the
    backfill script uses: .select(..., joined).execute(),
    .delete().eq().eq().execute(), .update({...}).eq().eq().execute()."""

    def __init__(self, sb: "StubSupabase", table: str):
        self._sb = sb
        self._table = table
        self._select_cols: str | None = None
        self._filters: list[tuple[str, str]] = []
        self._op: str = "select"
        self._update_payload: dict | None = None

    def select(self, cols: str = "*"):
        self._select_cols = cols
        self._op = "select"
        return self

    def update(self, payload: dict):
        self._op = "update"
        self._update_payload = payload
        return self

    def delete(self):
        self._op = "delete"
        return self

    def eq(self, col: str, val):
        self._filters.append((col, val))
        return self

    def execute(self):
        if self._op == "select":
            rows = list(self._sb.tables.get(self._table, []))
            for col, val in self._filters:
                rows = [r for r in rows if r.get(col) == val]
            # If the script asked for "...skills(name)" embed, attach
            # the skill name from the parent's skills table.
            if self._select_cols and "skills(name)" in (self._select_cols or ""):
                for r in rows:
                    sid = r.get("skill_id")
                    name = next(
                        (s["name"] for s in self._sb.tables["skills"] if s["id"] == sid),
                        None,
                    )
                    r["skills"] = {"name": name}
            return _Result(rows)
        if self._op == "delete":
            rows = self._sb.tables.get(self._table, [])
            keep = []
            for r in rows:
                if all(r.get(c) == v for c, v in self._filters):
                    continue
                keep.append(r)
            self._sb.tables[self._table] = keep
            return _Result([])
        if self._op == "update":
            rows = self._sb.tables.get(self._table, [])
            for r in rows:
                if all(r.get(c) == v for c, v in self._filters):
                    r.update(self._update_payload or {})
            return _Result([])
        return _Result([])


class _Result:
    def __init__(self, data):
        self.data = data


class StubSupabase:
    def __init__(self, tables: dict[str, list[dict]]):
        # Deep copy so a test's mutations don't leak into another.
        self.tables = {k: [dict(r) for r in v] for k, v in tables.items()}

    def table(self, name: str):
        return _Query(self, name)


# ── Stub resolver: maps skill name -> canonical id ──────────────────


def _stub_resolver_factory(name_to_id: dict[str, str]):
    async def resolver(name, *, supabase, cache=None):
        norm = (name or "").lower()
        if cache is not None and norm in cache:
            return cache[norm]
        sid = name_to_id.get(norm)
        if cache is not None and sid is not None:
            cache[norm] = sid
        return sid
    return resolver


# ── Tests ────────────────────────────────────────────────────────────


def test_unchanged_when_resolver_agrees_with_existing_skill_id():
    mod = _load_script_module()
    sb = StubSupabase(
        tables={
            "skills": [{"id": "sk-pg", "name": "postgresql"}],
            "user_skills": [
                {"user_id": "u-1", "skill_id": "sk-pg"},
            ],
            "job_skills": [],
        }
    )
    resolver = _stub_resolver_factory({"postgresql": "sk-pg"})

    result = asyncio.run(
        mod._canonicalize_table(
            sb, resolver, "user_skills", "user_id", dry_run=False
        )
    )
    assert result == {"rewritten": 0, "deleted": 0, "unchanged": 1}
    # Row untouched.
    assert sb.tables["user_skills"] == [
        {"user_id": "u-1", "skill_id": "sk-pg", "skills": {"name": "postgresql"}}
    ]


def test_rewrites_skill_id_to_canonical():
    """The original row pointed at the non-canonical 'sk-postgres-alias',
    but the resolver says it should be 'sk-pg'. The backfill must
    rewrite the row in place."""
    mod = _load_script_module()
    sb = StubSupabase(
        tables={
            "skills": [
                {"id": "sk-pg", "name": "postgresql"},
                {"id": "sk-postgres-alias", "name": "postgres"},
            ],
            "user_skills": [
                {"user_id": "u-1", "skill_id": "sk-postgres-alias"},
            ],
            "job_skills": [],
        }
    )
    resolver = _stub_resolver_factory(
        {"postgres": "sk-pg", "postgresql": "sk-pg"}
    )

    result = asyncio.run(
        mod._canonicalize_table(
            sb, resolver, "user_skills", "user_id", dry_run=False
        )
    )
    assert result["rewritten"] == 1
    assert result["deleted"] == 0
    # The skill_id on the original row got pointed at the canonical.
    assert sb.tables["user_skills"][0]["skill_id"] == "sk-pg"


def test_deletes_duplicate_when_canonical_already_present_on_parent():
    """A user has BOTH 'sk-pg' (canonical) and 'sk-postgres-alias' (dup).
    The backfill should delete the dup and leave the canonical alone —
    not error on a PK conflict."""
    mod = _load_script_module()
    sb = StubSupabase(
        tables={
            "skills": [
                {"id": "sk-pg", "name": "postgresql"},
                {"id": "sk-postgres-alias", "name": "postgres"},
            ],
            "user_skills": [
                # Order matters: canonical first, then duplicate, so the
                # `seen_canonical` set already has the canonical key when
                # the duplicate row is processed.
                {"user_id": "u-1", "skill_id": "sk-pg"},
                {"user_id": "u-1", "skill_id": "sk-postgres-alias"},
            ],
            "job_skills": [],
        }
    )
    resolver = _stub_resolver_factory(
        {"postgres": "sk-pg", "postgresql": "sk-pg"}
    )

    result = asyncio.run(
        mod._canonicalize_table(
            sb, resolver, "user_skills", "user_id", dry_run=False
        )
    )
    assert result["deleted"] == 1
    assert result["rewritten"] == 0
    # Only the canonical row survives.
    remaining = sb.tables["user_skills"]
    assert len(remaining) == 1
    assert remaining[0]["skill_id"] == "sk-pg"


def test_dry_run_writes_nothing():
    mod = _load_script_module()
    sb = StubSupabase(
        tables={
            "skills": [
                {"id": "sk-pg", "name": "postgresql"},
                {"id": "sk-postgres-alias", "name": "postgres"},
            ],
            "user_skills": [
                {"user_id": "u-1", "skill_id": "sk-postgres-alias"},
            ],
            "job_skills": [],
        }
    )
    resolver = _stub_resolver_factory({"postgres": "sk-pg"})

    result = asyncio.run(
        mod._canonicalize_table(
            sb, resolver, "user_skills", "user_id", dry_run=True
        )
    )
    # Counters report the same outcome...
    assert result["rewritten"] == 1
    # ...but the table is unchanged.
    assert sb.tables["user_skills"][0]["skill_id"] == "sk-postgres-alias"


def test_unknown_skill_name_is_treated_as_unchanged():
    """If the resolver returns None (skill name is empty or untracked),
    the row is left alone — better than risking a wrong rewrite."""
    mod = _load_script_module()
    sb = StubSupabase(
        tables={
            "skills": [{"id": "sk-mystery", "name": ""}],
            "user_skills": [
                {"user_id": "u-1", "skill_id": "sk-mystery"},
            ],
            "job_skills": [],
        }
    )
    resolver = _stub_resolver_factory({})  # nothing maps

    result = asyncio.run(
        mod._canonicalize_table(
            sb, resolver, "user_skills", "user_id", dry_run=False
        )
    )
    # The name is empty so the script's early-exit branch kicks in.
    assert result["unchanged"] == 1
    assert result["rewritten"] == 0
    assert result["deleted"] == 0
