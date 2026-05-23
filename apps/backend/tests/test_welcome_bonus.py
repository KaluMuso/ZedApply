"""Welcome match bonus and free-tier baseline quota."""
from datetime import datetime, timedelta, timezone

import pytest

from app.core.tier_gating import (
    effective_free_match_limit,
    get_effective_match_limit,
    welcome_bonus_active,
)
from tests.conftest import FakeSupabaseQuery


def test_welcome_bonus_applied_to_new_user():
    until = datetime.now(timezone.utc) + timedelta(days=45)
    assert welcome_bonus_active(until) is True
    assert (
        effective_free_match_limit(
            tier_config_limit=3,
            welcome_match_bonus=7,
            welcome_match_bonus_until=until,
        )
        == 7
    )


def test_welcome_bonus_expires_after_2_months():
    until = datetime.now(timezone.utc) - timedelta(days=1)
    assert welcome_bonus_active(until) is False
    assert (
        effective_free_match_limit(
            tier_config_limit=3,
            welcome_match_bonus=7,
            welcome_match_bonus_until=until,
        )
        == 3
    )


def test_free_user_post_bonus_capped_at_3_matches():
    until = datetime.now(timezone.utc) - timedelta(hours=1)
    assert (
        effective_free_match_limit(
            tier_config_limit=3,
            welcome_match_bonus=7,
            welcome_match_bonus_until=until,
        )
        == 3
    )


@pytest.mark.asyncio
async def test_get_effective_match_limit_free_welcome_active(fake_supabase):
    promo_until = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
    fake_supabase.set_table(
        "users",
        FakeSupabaseQuery(
            data=[
                {
                    "id": "test-user-id",
                    "subscription_tier": "free",
                    "welcome_match_bonus": 7,
                    "welcome_match_bonus_until": promo_until,
                    "promotion_applied_until": promo_until,
                }
            ]
        ),
    )
    fake_supabase.set_table(
        "subscriptions",
        FakeSupabaseQuery(data=[{"tier": "free", "status": "active"}]),
    )
    fake_supabase.set_table(
        "tier_config",
        FakeSupabaseQuery(
            data=[
                {
                    "tier": "free",
                    "display_name": "Free",
                    "price_ngwee": 0,
                    "matches_limit": 3,
                    "sort_order": 0,
                },
                {
                    "tier": "starter",
                    "display_name": "Starter",
                    "price_ngwee": 12500,
                    "matches_limit": 50,
                    "sort_order": 1,
                },
                {
                    "tier": "professional",
                    "display_name": "Professional",
                    "price_ngwee": 25000,
                    "matches_limit": 125,
                    "sort_order": 2,
                },
                {
                    "tier": "super_standard",
                    "display_name": "Super Standard",
                    "price_ngwee": 50000,
                    "matches_limit": 99999,
                    "sort_order": 3,
                },
            ]
        ),
    )
    from app.services import tier_config as tier_config_svc

    tier_config_svc.clear_tier_config_cache()

    limit = await get_effective_match_limit("test-user-id", fake_supabase)
    assert limit == 7


def test_admin_can_extend_user_welcome_bonus(client, admin_headers, fake_supabase):
    extended = (datetime.now(timezone.utc) + timedelta(days=90)).isoformat()
    admin_row = {
        "id": "admin-user-id",
        "phone": "+260971111111",
        "role": "superadmin",
        "subscription_tier": "super_standard",
    }
    user_row = {
        "id": "user-extend-1",
        "phone": "+260972222222",
        "full_name": "Extend Me",
        "location": None,
        "subscription_tier": "free",
        "role": "user",
        "welcome_match_bonus": 7,
        "welcome_match_bonus_until": extended,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    class _UsersQuery(FakeSupabaseQuery):
        def __init__(self):
            super().__init__(data=[])
            self._eq_col = None
            self._eq_val = None

        def eq(self, col, val):
            self._eq_col = col
            self._eq_val = val
            return self

        def update(self, data):
            user_row.update(data)
            return self

        def execute(self):
            if self._eq_col == "id" and self._eq_val == "admin-user-id":
                self._data = [admin_row]
            elif self._eq_col == "id" and self._eq_val == "user-extend-1":
                self._data = [user_row]
            else:
                self._data = [user_row]
            return super().execute()

    fake_supabase.set_table("users", _UsersQuery())
    fake_supabase.set_table(
        "subscriptions",
        FakeSupabaseQuery(data=[{"tier": "free", "status": "active"}]),
    )
    fake_supabase.set_table(
        "tier_config",
        FakeSupabaseQuery(
            data=[
                {
                    "tier": "free",
                    "display_name": "Free",
                    "price_ngwee": 0,
                    "matches_limit": 3,
                    "sort_order": 0,
                },
                {
                    "tier": "starter",
                    "display_name": "Starter",
                    "price_ngwee": 12500,
                    "matches_limit": 50,
                    "sort_order": 1,
                },
                {
                    "tier": "professional",
                    "display_name": "Professional",
                    "price_ngwee": 25000,
                    "matches_limit": 125,
                    "sort_order": 2,
                },
                {
                    "tier": "super_standard",
                    "display_name": "Super Standard",
                    "price_ngwee": 50000,
                    "matches_limit": 99999,
                    "sort_order": 3,
                },
            ]
        ),
    )
    fake_supabase.set_table("matches", FakeSupabaseQuery(data=[], count=0))

    from app.services import tier_config as tier_config_svc

    tier_config_svc.clear_tier_config_cache()

    new_until = (datetime.now(timezone.utc) + timedelta(days=120)).isoformat()
    resp = client.patch(
        "/api/v1/admin/users/user-extend-1/welcome-bonus",
        headers=admin_headers,
        json={"welcome_match_bonus_until": new_until, "welcome_match_bonus": 9},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["welcome_match_bonus"] == 9
    returned_until = datetime.fromisoformat(
        body["welcome_match_bonus_until"].replace("Z", "+00:00")
    )
    expected_until = datetime.fromisoformat(new_until.replace("Z", "+00:00"))
    assert returned_until == expected_until
    assert body["matches_limit"] == 9
