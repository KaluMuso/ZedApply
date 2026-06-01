"""Admin Bwana config API."""
from unittest.mock import AsyncMock, patch

import pytest

from tests.conftest import FakeSupabaseQuery

BWANA_ROW = {
    "id": 1,
    "chatbot_display_name": "Bwana",
    "operator_display_name": "ZedApply Support",
    "support_email": "convergeozambia@gmail.com",
    "support_phone": "+260761359005",
    "escalation_whatsapp_phone": "+260761359005",
    "escalation_sla_hours": 24,
    "human_escalation_reply_template": "Human {email}",
    "unsatisfied_reply_template": "Sorry {email}",
    "contact_admin_reply_template": "Contact {email}",
    "public_knowledge_extra": "",
    "enable_email_escalation": True,
}


def _seed_admin_user(fake_supabase):
    fake_supabase.set_table(
        "users",
        FakeSupabaseQuery(
            data=[{"id": "test-user-id", "phone": "+260971234567", "role": "admin"}]
        ),
    )


@pytest.fixture
def bwana_admin_tables(fake_supabase):
    _seed_admin_user(fake_supabase)
    fake_supabase.set_table("bwana_platform_config", FakeSupabaseQuery(data=[BWANA_ROW]))
    fake_supabase.set_table("bwana_escalation_log", FakeSupabaseQuery(data=[]))
    fake_supabase.set_table("ai_cache", FakeSupabaseQuery(data=[]))
    return fake_supabase


def test_get_admin_bwana_config_requires_admin(client, auth_headers, bwana_admin_tables):
    resp = client.get("/api/v1/admin/bwana/config", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["support_email"] == "convergeozambia@gmail.com"


def test_patch_admin_bwana_config(client, auth_headers, bwana_admin_tables):
    resp = client.patch(
        "/api/v1/admin/bwana/config",
        headers=auth_headers,
        json={"support_email": "ops@zedapply.com", "escalation_sla_hours": 48},
    )
    assert resp.status_code == 200
    assert resp.json()["support_email"] == "ops@zedapply.com"
    assert resp.json()["escalation_sla_hours"] == 48


def test_patch_bwana_rejects_invalid_phone(client, auth_headers, bwana_admin_tables):
    resp = client.patch(
        "/api/v1/admin/bwana/config",
        headers=auth_headers,
        json={"support_phone": "invalid"},
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_test_escalation_endpoint(client, auth_headers, bwana_admin_tables):
    with patch(
        "app.api.v1.admin_bwana.send_test_escalation_whatsapp",
        new_callable=AsyncMock,
    ) as mock_send:
        mock_send.return_value = None
        resp = client.post(
            "/api/v1/admin/bwana/test-escalation",
            headers=auth_headers,
        )
    assert resp.status_code == 200
    mock_send.assert_awaited_once()
