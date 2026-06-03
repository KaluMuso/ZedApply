"""Admin search/export over Bwana chat transcripts in ai_cache."""
from __future__ import annotations

import csv
import io
from typing import Any

from supabase import Client

from app.schemas.bwana_config import (
    BwanaConversationList,
    BwanaConversationSummary,
)
from app.schemas.db_enums import CacheType


def _snippet(messages: list[dict[str, Any]], *, max_len: int = 120) -> str:
    for msg in reversed(messages):
        if msg.get("role") == "user":
            text = str(msg.get("content") or "").strip()
            if text:
                return text[:max_len] + ("…" if len(text) > max_len else "")
    return ""


def _last_ts(messages: list[dict[str, Any]], fallback: str | None) -> str | None:
    for msg in reversed(messages):
        ts = msg.get("ts")
        if ts:
            return str(ts)
    return fallback


def _matches_query(
    row: dict[str, Any],
    messages: list[dict[str, Any]],
    q: str,
) -> bool:
    needle = q.lower()
    if needle in str(row.get("user_id") or "").lower():
        return True
    if needle in str(row.get("session_id") or "").lower():
        return True
    for msg in messages:
        if needle in str(msg.get("content") or "").lower():
            return True
    return False


def _load_bwana_chat_rows(supabase: Client, *, limit: int) -> list[dict[str, Any]]:
    resp = (
        supabase.table("ai_cache")
        .select("cache_key, result, created_at")
        .eq("cache_type", CacheType.bwana_chat.value)
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return resp.data or []


def list_bwana_conversations(
    supabase: Client,
    *,
    q: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> BwanaConversationList:
    """List recent Bwana sessions from ai_cache (service-role only)."""
    fetch_cap = min(max(limit + offset, limit), 500)
    raw_rows = _load_bwana_chat_rows(supabase, limit=fetch_cap)
    summaries: list[BwanaConversationSummary] = []

    for row in raw_rows:
        payload = row.get("result") or {}
        if not isinstance(payload, dict):
            continue
        user_id = str(payload.get("user_id") or "")
        session_id = str(payload.get("session_id") or "")
        messages = payload.get("messages") or []
        if not isinstance(messages, list):
            messages = []
        if q and not _matches_query(
            {"user_id": user_id, "session_id": session_id},
            messages,
            q.strip(),
        ):
            continue
        summaries.append(
            BwanaConversationSummary(
                user_id=user_id,
                session_id=session_id,
                message_count=len(messages),
                last_activity_at=_last_ts(messages, row.get("created_at")),
                preview=_snippet(messages),
            )
        )

    total = len(summaries)
    page = summaries[offset : offset + limit]
    return BwanaConversationList(
        items=page,
        total=total,
        q=q.strip() if q else None,
        limit=limit,
        offset=offset,
    )


def export_bwana_conversations_csv(
    supabase: Client,
    *,
    q: str | None = None,
    max_rows: int = 2000,
) -> str:
    """Flatten transcripts to CSV for admin download."""
    raw_rows = _load_bwana_chat_rows(supabase, limit=max_rows)
    buf = io.StringIO()
    writer = csv.writer(buf, lineterminator="\n")
    writer.writerow(
        ["user_id", "session_id", "role", "content", "source", "ts", "cache_created_at"]
    )

    for row in raw_rows:
        payload = row.get("result") or {}
        if not isinstance(payload, dict):
            continue
        user_id = str(payload.get("user_id") or "")
        session_id = str(payload.get("session_id") or "")
        messages = payload.get("messages") or []
        if not isinstance(messages, list):
            messages = []
        if q and not _matches_query(
            {"user_id": user_id, "session_id": session_id},
            messages,
            q.strip(),
        ):
            continue
        created = row.get("created_at") or ""
        for msg in messages:
            if not isinstance(msg, dict):
                continue
            writer.writerow(
                [
                    user_id,
                    session_id,
                    str(msg.get("role") or ""),
                    str(msg.get("content") or "")[:8000],
                    str(msg.get("source") or ""),
                    str(msg.get("ts") or ""),
                    created,
                ]
            )

    return buf.getvalue()
