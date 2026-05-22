"""Unit tests for subscription tier gating (Mwana / Mwizi / Wino)."""
from datetime import date, timedelta
from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException

from app.core.tier_gating import (
    FEATURE_COVER_LETTER,
    FEATURE_JOB_MATCHES,
    normalize_tier,
    verify_tier_access,
)
from tests.conftest import FakeSupabaseQuery


def _seed_gating_user(fake_supabase, *, tier: str, viewed: int = 0, role: str = "user"):
    reset = (date.today() + timedelta(days=28)).isoformat()
    fake_supabase.set_table(
        "users",
        FakeSupabaseQuery(
            data=[
                {
                    "id": "test-user-id",
                    "phone": "+260971234567",
                    "role": role,
                    "subscription_tier": tier,
                    "matches_viewed_this_month": viewed,
                    "billing_cycle_reset": reset,
                }
            ]
        ),
    )


class TestNormalizeTier:
    def test_legacy_free_maps_to_mwana(self):
        assert normalize_tier("free") == "mwana"

    def test_legacy_starter_maps_to_mwizi(self):
        assert normalize_tier("starter") == "mwizi"

    def test_legacy_professional_maps_to_wino(self):
        assert normalize_tier("professional") == "wino"


class TestVerifyTierAccessCoverLetter:
    @pytest.mark.asyncio
    async def test_mwana_blocked(self, fake_supabase):
        _seed_gating_user(fake_supabase, tier="mwana")
        with pytest.raises(HTTPException) as exc:
            await verify_tier_access(
                FEATURE_COVER_LETTER, "test-user-id", fake_supabase
            )
        assert exc.value.status_code == 403
        assert "Mwizi or Wino" in exc.value.detail

    @pytest.mark.asyncio
    async def test_mwizi_blocked(self, fake_supabase):
        _seed_gating_user(fake_supabase, tier="mwizi")
        with pytest.raises(HTTPException) as exc:
            await verify_tier_access(
                FEATURE_COVER_LETTER, "test-user-id", fake_supabase
            )
        assert exc.value.status_code == 403
        assert "Wino" in exc.value.detail

    @pytest.mark.asyncio
    async def test_wino_allowed(self, fake_supabase):
        _seed_gating_user(fake_supabase, tier="wino")
        tier = await verify_tier_access(
            FEATURE_COVER_LETTER, "test-user-id", fake_supabase
        )
        assert tier == "wino"


class TestVerifyTierAccessJobMatches:
    @pytest.mark.asyncio
    async def test_mwana_at_limit_blocked(self, fake_supabase):
        _seed_gating_user(fake_supabase, tier="mwana", viewed=5)
        with pytest.raises(HTTPException) as exc:
            await verify_tier_access(
                FEATURE_JOB_MATCHES, "test-user-id", fake_supabase
            )
        assert exc.value.status_code == 403
        assert "limit" in exc.value.detail.lower()

    @pytest.mark.asyncio
    async def test_mwana_increment_over_limit_blocked(self, fake_supabase):
        _seed_gating_user(fake_supabase, tier="mwana", viewed=4)
        with pytest.raises(HTTPException) as exc:
            await verify_tier_access(
                FEATURE_JOB_MATCHES,
                "test-user-id",
                fake_supabase,
                increment_match_views=2,
            )
        assert exc.value.status_code == 403
