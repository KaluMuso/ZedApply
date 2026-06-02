"""Settings validation for embedding provider env."""
from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.core.config import Settings


def _base_env(**overrides: object) -> dict[str, object]:
    data: dict[str, object] = {
        "supabase_url": "https://example.supabase.co",
        "supabase_key": "service-role",
        "jwt_secret": "jwt-secret",
    }
    data.update(overrides)
    return data


def test_openrouter_only_embedding_allows_missing_gemini_key():
    settings = Settings(
        **_base_env(
            gemini_api_key="",
            openrouter_api_key="sk-or-test",
            embedding_via_openrouter=True,
        )
    )
    assert settings.embedding_via_openrouter is True
    assert settings.gemini_api_key == ""


def test_gemini_required_when_not_openrouter_only():
    with pytest.raises(ValidationError, match="GEMINI_API_KEY is required"):
        Settings(
            **_base_env(
                gemini_api_key="",
                openrouter_api_key="sk-or-test",
                embedding_via_openrouter=False,
            )
        )


def test_openrouter_required_when_embedding_via_openrouter():
    with pytest.raises(ValidationError, match="OPENROUTER_API_KEY is required"):
        Settings(
            **_base_env(
                gemini_api_key="AIza-test",
                openrouter_api_key="",
                embedding_via_openrouter=True,
            )
        )
