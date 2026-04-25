"""Tests for /profile, /profile/preferences and /profile/skills."""
from tests.conftest import FakeSupabaseQuery


def _user_row(**overrides):
    base = {
        "id": "test-user-id",
        "phone": "+260971234567",
        "full_name": "Tester",
        "email": "tester@example.com",
        "location": "Lusaka",
        "years_experience": 3,
        "subscription_tier": "mwana",
        "role": "user",
        "whatsapp_alerts": True,
        "language": "en",
    }
    base.update(overrides)
    return base


class TestProfileGet:
    def test_returns_profile(self, client, fake_supabase, auth_headers):
        fake_supabase.set_table("users", FakeSupabaseQuery(data=[_user_row()]))
        fake_supabase.set_table("user_skills", FakeSupabaseQuery(data=[]))
        fake_supabase.set_table("cvs", FakeSupabaseQuery(data=[]))
        resp = client.get("/api/v1/profile", headers=auth_headers)
        assert resp.status_code == 200
        body = resp.json()
        assert body["id"] == "test-user-id"
        assert body["phone"] == "+260971234567"
        assert body["cv_uploaded"] is False
        assert body["skills"] == []

    def test_404_when_user_missing(self, client, fake_supabase, auth_headers):
        fake_supabase.set_table("users", FakeSupabaseQuery(data=[]))
        resp = client.get("/api/v1/profile", headers=auth_headers)
        assert resp.status_code == 404


class TestProfileUpdate:
    def test_patch_applies_changes(self, client, fake_supabase, auth_headers):
        # Both the update and the subsequent read happen against the same fake.
        fake_supabase.set_table(
            "users",
            FakeSupabaseQuery(data=[_user_row(full_name="New Name")]),
        )
        fake_supabase.set_table("user_skills", FakeSupabaseQuery(data=[]))
        fake_supabase.set_table("cvs", FakeSupabaseQuery(data=[]))
        resp = client.patch(
            "/api/v1/profile",
            headers=auth_headers,
            json={"full_name": "New Name"},
        )
        assert resp.status_code == 200
        assert resp.json()["full_name"] == "New Name"

    def test_patch_rejects_empty_body(self, client, fake_supabase, auth_headers):
        fake_supabase.set_table("users", FakeSupabaseQuery(data=[_user_row()]))
        resp = client.patch("/api/v1/profile", headers=auth_headers, json={})
        assert resp.status_code == 422


class TestProfileDelete:
    def test_delete_returns_confirmation(self, client, fake_supabase, auth_headers):
        fake_supabase.set_table("users", FakeSupabaseQuery(data=[{"id": "test-user-id"}]))
        resp = client.delete("/api/v1/profile", headers=auth_headers)
        assert resp.status_code == 200
        body = resp.json()
        assert body["deleted"] is True
        assert body["user_id"] == "test-user-id"

    def test_delete_404_when_missing(self, client, fake_supabase, auth_headers):
        fake_supabase.set_table("users", FakeSupabaseQuery(data=[]))
        resp = client.delete("/api/v1/profile", headers=auth_headers)
        assert resp.status_code == 404


class TestPreferences:
    def test_get_preferences(self, client, fake_supabase, auth_headers):
        fake_supabase.set_table(
            "users",
            FakeSupabaseQuery(data=[{"whatsapp_alerts": True, "language": "en"}]),
        )
        resp = client.get("/api/v1/profile/preferences", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json() == {"whatsapp_alerts": True, "language": "en"}

    def test_patch_preferences_language(self, client, fake_supabase, auth_headers):
        fake_supabase.set_table(
            "users",
            FakeSupabaseQuery(data=[{"whatsapp_alerts": True, "language": "bem"}]),
        )
        resp = client.patch(
            "/api/v1/profile/preferences",
            headers=auth_headers,
            json={"language": "bem"},
        )
        assert resp.status_code == 200
        assert resp.json()["language"] == "bem"

    def test_patch_preferences_rejects_unknown_language(self, client, fake_supabase, auth_headers):
        resp = client.patch(
            "/api/v1/profile/preferences",
            headers=auth_headers,
            json={"language": "fr"},
        )
        assert resp.status_code == 422

    def test_patch_preferences_rejects_empty(self, client, fake_supabase, auth_headers):
        resp = client.patch(
            "/api/v1/profile/preferences",
            headers=auth_headers,
            json={},
        )
        assert resp.status_code == 422


class TestProfileSkills:
    def test_list_skills_returns_sorted(self, client, fake_supabase, auth_headers):
        fake_supabase.set_table(
            "user_skills",
            FakeSupabaseQuery(
                data=[
                    {"proficiency": "advanced", "source": "manual", "skills": {"name": "python"}},
                    {"proficiency": "beginner", "source": "cv_parse", "skills": {"name": "django"}},
                ]
            ),
        )
        resp = client.get("/api/v1/profile/skills", headers=auth_headers)
        assert resp.status_code == 200
        names = [s["name"] for s in resp.json()["skills"]]
        assert names == sorted(names)
        assert {"django", "python"} == set(names)

    def test_list_skills_skips_rows_with_no_skill(self, client, fake_supabase, auth_headers):
        fake_supabase.set_table(
            "user_skills",
            FakeSupabaseQuery(
                data=[
                    {"proficiency": "advanced", "source": "manual", "skills": None},
                    {"proficiency": "expert", "source": "manual", "skills": {"name": "sql"}},
                ]
            ),
        )
        resp = client.get("/api/v1/profile/skills", headers=auth_headers)
        assert resp.status_code == 200
        body = resp.json()
        assert len(body["skills"]) == 1
        assert body["skills"][0]["name"] == "sql"

    def test_add_existing_skill(self, client, fake_supabase, auth_headers):
        # skills lookup returns the canonical row by name
        fake_supabase.set_table(
            "skills",
            FakeSupabaseQuery(data=[{"id": "skill-uuid-1", "name": "python"}]),
        )
        fake_supabase.set_table(
            "user_skills",
            FakeSupabaseQuery(
                data=[
                    {"proficiency": "advanced", "source": "manual", "skills": {"name": "python"}}
                ]
            ),
        )
        resp = client.post(
            "/api/v1/profile/skills",
            headers=auth_headers,
            json={"name": "Python", "proficiency": "advanced"},
        )
        assert resp.status_code == 201
        body = resp.json()
        assert any(s["name"] == "python" and s["proficiency"] == "advanced" for s in body["skills"])

    def test_add_new_skill_creates_row(self, client, fake_supabase, auth_headers):
        # Empty initial skills table → triggers insert in the handler.
        fake_supabase.set_table("skills", FakeSupabaseQuery(data=[]))
        fake_supabase.set_table("skill_aliases", FakeSupabaseQuery(data=[]))
        fake_supabase.set_table(
            "user_skills",
            FakeSupabaseQuery(
                data=[
                    {"proficiency": "intermediate", "source": "manual", "skills": {"name": "customer support"}}
                ]
            ),
        )
        resp = client.post(
            "/api/v1/profile/skills",
            headers=auth_headers,
            json={"name": "Customer Support"},
        )
        assert resp.status_code == 201
        names = [s["name"] for s in resp.json()["skills"]]
        assert "customer support" in names

    def test_add_skill_rejects_empty_name(self, client, fake_supabase, auth_headers):
        resp = client.post(
            "/api/v1/profile/skills",
            headers=auth_headers,
            json={"name": ""},
        )
        assert resp.status_code == 422

    def test_update_skill_proficiency(self, client, fake_supabase, auth_headers):
        fake_supabase.set_table(
            "skills",
            FakeSupabaseQuery(data=[{"id": "skill-uuid-1"}]),
        )
        fake_supabase.set_table(
            "user_skills",
            FakeSupabaseQuery(
                data=[
                    {"proficiency": "expert", "source": "manual", "skills": {"name": "python"}}
                ]
            ),
        )
        resp = client.patch(
            "/api/v1/profile/skills/python",
            headers=auth_headers,
            json={"proficiency": "expert"},
        )
        assert resp.status_code == 200
        s = resp.json()["skills"][0]
        assert s["proficiency"] == "expert"

    def test_update_skill_404_when_unknown(self, client, fake_supabase, auth_headers):
        fake_supabase.set_table("skills", FakeSupabaseQuery(data=[]))
        fake_supabase.set_table("skill_aliases", FakeSupabaseQuery(data=[]))
        resp = client.patch(
            "/api/v1/profile/skills/unknown-skill",
            headers=auth_headers,
            json={"proficiency": "advanced"},
        )
        assert resp.status_code == 404

    def test_remove_skill(self, client, fake_supabase, auth_headers):
        fake_supabase.set_table(
            "skills",
            FakeSupabaseQuery(data=[{"id": "skill-uuid-1"}]),
        )
        fake_supabase.set_table("user_skills", FakeSupabaseQuery(data=[]))
        resp = client.delete("/api/v1/profile/skills/python", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json() == {"skills": []}

    def test_remove_skill_404_when_unknown(self, client, fake_supabase, auth_headers):
        fake_supabase.set_table("skills", FakeSupabaseQuery(data=[]))
        fake_supabase.set_table("skill_aliases", FakeSupabaseQuery(data=[]))
        resp = client.delete("/api/v1/profile/skills/unknown-skill", headers=auth_headers)
        assert resp.status_code == 404
