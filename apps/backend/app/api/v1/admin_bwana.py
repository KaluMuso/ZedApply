"""Admin API for Bwana platform config and escalation smoke tests."""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response

from app.core.deps import get_supabase, require_admin
from app.schemas.bwana_config import (
    BwanaAnalyticsSummary,
    BwanaConfig,
    BwanaConfigPatch,
    BwanaConfigPreview,
    BwanaConversationList,
)
from app.services.bwana_analytics import fetch_bwana_analytics
from app.services.bwana_chat import send_test_escalation_whatsapp
from app.services.bwana_config import (
    clear_bwana_config_cache,
    config_row_for_db,
    get_bwana_config,
    preview_system_prompt,
)
from app.services.bwana_conversations import (
    export_bwana_conversations_csv,
    list_bwana_conversations,
)

router = APIRouter(
    prefix="/admin/bwana",
    tags=["Admin"],
    dependencies=[Depends(require_admin)],
)


@router.get("/config", response_model=BwanaConfig)
async def get_admin_bwana_config(
    supabase=Depends(get_supabase),
) -> BwanaConfig:
    return get_bwana_config(supabase, force=True)


@router.patch("/config", response_model=BwanaConfig)
async def patch_admin_bwana_config(
    body: BwanaConfigPatch,
    current_user: dict = Depends(require_admin),
    supabase=Depends(get_supabase),
) -> BwanaConfig:
    existing = get_bwana_config(supabase, force=True)
    patch = body.model_dump(exclude_unset=True)
    if not patch:
        return existing

    merged = existing.model_dump()
    merged.update(patch)
    merged["updated_at"] = datetime.now(timezone.utc).isoformat()
    merged["updated_by"] = current_user["id"]

    try:
        validated = BwanaConfig.model_validate(merged)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    row = config_row_for_db(validated)
    row.pop("id", None)
    supabase.table("bwana_platform_config").upsert(
        {"id": 1, **row},
        on_conflict="id",
    ).execute()
    clear_bwana_config_cache()
    return validated


@router.get("/config/preview", response_model=BwanaConfigPreview)
async def get_bwana_prompt_preview(
    supabase=Depends(get_supabase),
) -> BwanaConfigPreview:
    prompt, count, version = await preview_system_prompt(supabase)
    truncated = prompt[:8000] + ("…" if len(prompt) > 8000 else "")
    return BwanaConfigPreview(
        system_prompt_preview=truncated,
        char_count=count,
        system_prompt_version=version,
    )


@router.get("/analytics", response_model=BwanaAnalyticsSummary)
async def get_bwana_analytics(
    days: int = 7,
    supabase=Depends(get_supabase),
) -> BwanaAnalyticsSummary:
    if days < 1 or days > 90:
        raise HTTPException(status_code=422, detail="days must be 1–90")
    return fetch_bwana_analytics(supabase, days=days)


@router.get("/conversations", response_model=BwanaConversationList)
async def list_bwana_conversations_admin(
    q: str | None = Query(None, max_length=200),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0, le=5000),
    supabase=Depends(get_supabase),
) -> BwanaConversationList:
    """Search Bwana transcripts stored in ai_cache (admin JWT only)."""
    return list_bwana_conversations(supabase, q=q, limit=limit, offset=offset)


@router.get("/conversations/export")
async def export_bwana_conversations_admin(
    q: str | None = Query(None, max_length=200),
    supabase=Depends(get_supabase),
) -> Response:
    """Download conversation turns as CSV (PII — admin only)."""
    body = export_bwana_conversations_csv(supabase, q=q)
    return Response(
        content=body,
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": 'attachment; filename="bwana-conversations.csv"',
        },
    )


@router.post("/test-escalation")
async def test_bwana_escalation(
    supabase=Depends(get_supabase),
) -> dict[str, str]:
    try:
        await send_test_escalation_whatsapp(supabase)
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail=f"WhatsApp test failed: {exc}",
        ) from exc
    return {"status": "sent", "detail": "Test message sent to escalation WhatsApp."}
