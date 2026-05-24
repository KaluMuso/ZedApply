"""Lenco production env flag and API URL resolution."""
from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.core.config import (
    LENCO_PRODUCTION_API_URL,
    LENCO_SANDBOX_API_URL,
    Settings,
)
from app.services.lenco import is_lenco_production


def _settings(**overrides: object) -> Settings:
    base: dict[str, object] = {
        "supabase_url": "https://example.supabase.co",
        "supabase_key": "test-service-role",
        "gemini_api_key": "test-gemini",
        "jwt_secret": "test-jwt-secret",
    }
    base.update(overrides)
    return Settings(_env_file=None, **base)


class TestLencoEnvResolution:
    def test_sandbox_default_url(self) -> None:
        settings = _settings(lenco_env="sandbox")
        assert settings.lenco_api_url.rstrip("/") == LENCO_SANDBOX_API_URL.rstrip("/")
        assert settings.is_lenco_production is False
        assert is_lenco_production(settings) is False

    def test_production_env_swaps_default_sandbox_url(self) -> None:
        settings = _settings(lenco_env="production")
        assert "api.lenco.co" in settings.effective_lenco_api_url
        assert settings.is_lenco_production is True
        assert is_lenco_production(settings) is True

    def test_explicit_production_url_without_env_flag(self) -> None:
        settings = _settings(lenco_api_url=LENCO_PRODUCTION_API_URL)
        assert settings.lenco_env == "sandbox"
        assert settings.is_lenco_production is True

    def test_production_env_does_not_override_explicit_sandbox_url(self) -> None:
        settings = _settings(
            lenco_env="production",
            lenco_api_url=LENCO_SANDBOX_API_URL,
        )
        assert settings.lenco_api_url.rstrip("/") == LENCO_SANDBOX_API_URL.rstrip(
            "/"
        )
        assert settings.is_lenco_production is True

    def test_invalid_lenco_env_rejected(self) -> None:
        with pytest.raises(ValidationError):
            _settings(lenco_env="staging")  # type: ignore[arg-type]
