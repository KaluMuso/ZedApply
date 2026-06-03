"""Admin broadcast notification compose + cron dispatch."""
from __future__ import annotations

from fastapi import APIRouter, Depends, Header, status

from app.core.admin_auth import require_admin_api_key
from app.core.config import Settings, get_settings
from app.core.deps import get_supabase, require_admin_api_key_or_superadmin
from app.schemas.admin_notifications import (
    AdminNotificationCreate,
    AdminNotificationCreateResponse,
    AdminNotificationDispatchResponse,
)
from app.services.admin_notifications import (
    create_admin_notification_campaign,
    dispatch_due_campaigns,
)

router = APIRouter(prefix="/admin/notifications", tags=["Admin Notifications"])


@router.post(
    "",
    response_model=AdminNotificationCreateResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_admin_notification(
    body: AdminNotificationCreate,
    auth: dict = Depends(require_admin_api_key_or_superadmin),
    supabase=Depends(get_supabase),
    settings: Settings = Depends(get_settings),
):
    """Compose a broadcast push — target all users or one subscription tier."""
    created_by = None if auth.get("auth") == "api_key" else auth.get("id")
    return await create_admin_notification_campaign(
        body,
        supabase,
        settings=settings,
        created_by=created_by,
    )


def _require_cron_auth(
    settings: Settings,
    admin_api_key: str | None,
    x_admin_api_key: str | None,
    ingest_api_key: str | None,
    x_ingest_api_key: str | None,
) -> None:
    require_admin_api_key(
        settings,
        admin_api_key=admin_api_key,
        x_admin_api_key=x_admin_api_key,
        ingest_api_key=ingest_api_key,
        x_ingest_api_key=x_ingest_api_key,
    )


@router.post("/dispatch", response_model=AdminNotificationDispatchResponse)
async def dispatch_scheduled_notifications(
    admin_api_key: str | None = Header(None, alias="ADMIN_API_KEY"),
    x_admin_api_key: str | None = Header(None, alias="X-ADMIN-API-KEY"),
    ingest_api_key: str | None = Header(None, alias="INGEST_API_KEY"),
    x_ingest_api_key: str | None = Header(None, alias="X-INGEST-API-KEY"),
    supabase=Depends(get_supabase),
    settings: Settings = Depends(get_settings),
):
    """Cron — deliver campaigns whose scheduled_at is in the past."""
    _require_cron_auth(
        settings,
        admin_api_key,
        x_admin_api_key,
        ingest_api_key,
        x_ingest_api_key,
    )
    return await dispatch_due_campaigns(supabase, settings=settings)
