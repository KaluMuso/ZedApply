"""Shared fixtures for Zed CV backend tests.

Overrides all external dependencies (Supabase, OpenAI, WhatsApp) so tests
run without network access or real credentials.
"""
import os, sys
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

# ── Fake env vars so Settings() doesn't blow up ────────────────────────
os.environ.setdefault("SUPABASE_URL", "https://fake.supabase.co")
os.environ.setdefault("SUPABASE_KEY", "fake-service-key")
os.environ.setdefault("GEMINI_API_KEY", "fake-gemini-key")
os.environ.setdefault("OPENROUTER_API_KEY", "fake-openrouter-key")
os.environ.setdefault("JWT_SECRET", "test-secret-key-for-testing-only")

# Ensure the app package is importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


# ── Mock Supabase client ────────────────────────────────────────────────
class FakeSupabaseQuery:
    """Chainable mock that mimics supabase.table(...).select(...).eq(...) etc."""

    def __init__(self, data=None, count=None):
        self._data = data or []
        self._count = count
        self._single = False

    def select(self, *a, **kw):
        return self

    def insert(self, data):
        # If pre-set data exists (from set_table), return that instead
        # This lets tests control exactly what the DB "returns"
        if self._data:
            return self
        if isinstance(data, dict) and "id" not in data:
            data["id"] = "fake-uuid-001"
        self._data = [data] if isinstance(data, dict) else data
        return self

    def update(self, data):
        return self

    def upsert(self, data, **kw):
        return self

    def delete(self):
        return self

    def eq(self, *a):
        return self

    def gte(self, *a):
        return self

    def lt(self, *a):
        return self

    def in_(self, *a):
        return self

    def ilike(self, *a):
        return self

    def or_(self, *a):
        return self

    def order(self, *a, **kw):
        return self

    def limit(self, *a):
        return self

    def range(self, *a):
        return self

    def single(self):
        self._single = True
        return self

    def execute(self):
        result = MagicMock()
        if self._single:
            # Real supabase-py returns the first row as a dict (or None) on .single()
            if isinstance(self._data, list):
                result.data = self._data[0] if self._data else None
            else:
                result.data = self._data
        else:
            result.data = self._data
        result.count = self._count
        return result


class FakeSupabase:
    """Minimal mock Supabase client."""

    def __init__(self):
        self._tables = {}
        self.storage = MagicMock()
        self.storage.from_ = MagicMock(return_value=MagicMock())

    def table(self, name):
        return self._tables.get(name, FakeSupabaseQuery())

    def set_table(self, name, query: FakeSupabaseQuery):
        self._tables[name] = query

    def rpc(self, *a, **kw):
        return FakeSupabaseQuery(data=[True])


@pytest.fixture
def fake_supabase():
    return FakeSupabase()


# ── JWT helper ──────────────────────────────────────────────────────────
@pytest.fixture
def auth_token():
    """Return a valid JWT for user_id='test-user-id'."""
    from jose import jwt
    now = datetime.now(timezone.utc)
    return jwt.encode(
        {"sub": "test-user-id", "phone": "+260971234567",
         "exp": now + timedelta(hours=24), "iat": now},
        "test-secret-key-for-testing-only",
        algorithm="HS256",
    )


@pytest.fixture
def auth_headers(auth_token):
    return {"Authorization": f"Bearer {auth_token}"}


# ── App client with mocked deps ────────────────────────────────────────
@pytest.fixture
def client(fake_supabase):
    """TestClient with Supabase and external services mocked out."""
    from app.core.deps import get_supabase
    from app.core.rate_limit import limiter
    from main import app

    # Disable rate limiting in tests
    limiter.enabled = False
    app.dependency_overrides[get_supabase] = lambda: fake_supabase

    with TestClient(app) as c:
        yield c

    app.dependency_overrides.clear()
