"""Admin tier_config and public /tiers catalog."""
from unittest.mock import MagicMock

from tests.conftest import FakeSupabaseQuery


def _superadmin_users():
    return FakeSupabaseQuery(
        data=[{"id": "admin-user-id", "phone": "+260971111111", "role": "superadmin"}]
    )


def _tier_config_rows():
    return [
        {
            "tier": "mwana",
            "display_name": "Mwana",
            "price_ngwee": 0,
            "matches_limit": 5,
            "sort_order": 0,
            "updated_at": None,
        },
        {
            "tier": "mwizi",
            "display_name": "Mwizi",
            "price_ngwee": 7900,
            "matches_limit": 25,
            "sort_order": 1,
            "updated_at": None,
        },
        {
            "tier": "wino",
            "display_name": "Wino",
            "price_ngwee": 19900,
            "matches_limit": 99999,
            "sort_order": 2,
            "updated_at": None,
        },
    ]


class _TierConfigQuery(FakeSupabaseQuery):
    def __init__(self, data=None):
        initial = data or _tier_config_rows()
        super().__init__(data=initial)
        self.upserted: list[dict] = []
        self._by_tier = {row["tier"]: dict(row) for row in initial}

    def order(self, *args, **kwargs):
        return self

    def upsert(self, data, **kwargs):
        if isinstance(data, dict):
            self.upserted.append(data)
            self._by_tier[data["tier"]] = dict(data)
            self._data = list(self._by_tier.values())
        return self


class TestPublicTiers:
    def test_list_tiers_no_auth(self, client, fake_supabase):
        fake_supabase.set_table("tier_config", _TierConfigQuery())
        resp = client.get("/api/v1/tiers")
        assert resp.status_code == 200
        tiers = {t["tier"]: t for t in resp.json()["tiers"]}
        assert tiers["mwizi"]["price_ngwee"] == 7900
        assert tiers["mwizi"]["matches_limit"] == 25


class TestAdminTierConfig:
    def test_get_requires_superadmin(self, client, auth_headers, fake_supabase):
        fake_supabase.set_table(
            "users",
            FakeSupabaseQuery(data=[{"id": "test-user-id", "role": "user"}]),
        )
        resp = client.get("/api/v1/admin/tier-config", headers=auth_headers)
        assert resp.status_code == 403

    def test_get_superadmin(self, client, admin_headers, fake_supabase):
        fake_supabase.set_table("users", _superadmin_users())
        fake_supabase.set_table("tier_config", _TierConfigQuery())
        resp = client.get("/api/v1/admin/tier-config", headers=admin_headers)
        assert resp.status_code == 200
        assert len(resp.json()["tiers"]) == 3

    def test_update_starter_price(self, client, admin_headers, fake_supabase):
        from app.services import tier_config as tier_config_svc

        tier_config_svc.clear_tier_config_cache()
        fake_supabase.set_table("users", _superadmin_users())
        spy = _TierConfigQuery()
        fake_supabase.set_table("tier_config", spy)

        payload = {
            "tiers": [
                {
                    "tier": "mwana",
                    "display_name": "Mwana",
                    "price_ngwee": 0,
                    "matches_limit": 5,
                },
                {
                    "tier": "mwizi",
                    "display_name": "Mwizi",
                    "price_ngwee": 8500,
                    "matches_limit": 30,
                },
                {
                    "tier": "wino",
                    "display_name": "Wino",
                    "price_ngwee": 19900,
                    "matches_limit": 99999,
                },
            ]
        }
        resp = client.put(
            "/api/v1/admin/tier-config",
            headers=admin_headers,
            json=payload,
        )
        assert resp.status_code == 200
        mwizi = next(t for t in resp.json()["tiers"] if t["tier"] == "mwizi")
        assert mwizi["price_ngwee"] == 8500
        assert mwizi["matches_limit"] == 30
        assert any(u.get("tier") == "mwizi" and u.get("price_ngwee") == 8500 for u in spy.upserted)
