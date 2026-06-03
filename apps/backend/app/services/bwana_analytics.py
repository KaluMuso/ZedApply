"""Aggregate Bwana chat analytics for admin dashboard."""
from __future__ import annotations

import logging
from collections import Counter
from datetime import datetime, timedelta, timezone
from typing import Any

from supabase import Client

from app.core.config import get_settings
from app.schemas.bwana_config import BwanaAnalyticsSummary
from app.services.llm import FEATURE_BWANA

logger = logging.getLogger(__name__)


def _since_iso(days: int) -> str:
    since = datetime.now(timezone.utc) - timedelta(days=days)
    return since.isoformat()


def _bwana_llm_usage(
    supabase: Client, since: str
) -> tuple[float, int]:
    try:
        resp = (
            supabase.table("llm_usage_log")
            .select("cost_usd")
            .eq("feature", FEATURE_BWANA)
            .gte("created_at", since)
            .execute()
        )
        rows = resp.data or []
        cost = sum(float(r.get("cost_usd") or 0) for r in rows)
        return round(cost, 6), len(rows)
    except Exception as exc:
        logger.warning("bwana analytics: llm_usage_log query failed: %s", exc)
        return 0.0, 0


def fetch_bwana_analytics(supabase: Client, *, days: int = 7) -> BwanaAnalyticsSummary:
    since = _since_iso(days)
    settings = get_settings()
    pipeline_mode: str = (
        "n8n" if (settings.bwana_n8n_webhook_url or "").strip() else "in_process"
    )

    try:
        events_resp = (
            supabase.table("bwana_event_log")
            .select("source,intent_id,session_id,created_at")
            .gte("created_at", since)
            .execute()
        )
        events = events_resp.data or []
    except Exception as exc:
        logger.warning("bwana_event_log unavailable: %s", exc)
        return BwanaAnalyticsSummary(
            period_days=days,
            total_messages=0,
            total_escalations=0,
            escalation_rate_percent=0.0,
            messages_by_source={},
            escalations_by_reason={},
            top_faq_intents=[],
            pipeline_mode=pipeline_mode,  # type: ignore[arg-type]
            analytics_source="stub",
        )

    try:
        esc_resp = (
            supabase.table("bwana_escalation_log")
            .select("reason,created_at")
            .gte("created_at", since)
            .execute()
        )
        escalations = esc_resp.data or []
    except Exception as exc:
        logger.warning("bwana_escalation_log unavailable: %s", exc)
        escalations = []

    total_messages = len(events)
    total_escalations = len(escalations)
    rate = (
        round(100.0 * total_escalations / total_messages, 1)
        if total_messages > 0
        else 0.0
    )

    by_source: Counter[str] = Counter()
    faq_intents: Counter[str] = Counter()
    sessions: set[str] = set()
    for row in events:
        src = str(row.get("source") or "llm")
        by_source[src] += 1
        sid = row.get("session_id")
        if sid:
            sessions.add(str(sid))
        if src == "faq":
            iid = str(row.get("intent_id") or "unknown")
            faq_intents[iid] += 1

    by_reason: Counter[str] = Counter()
    for row in escalations:
        by_reason[str(row.get("reason") or "unknown")] += 1

    top_faq = [
        {"intent_id": k, "count": v}
        for k, v in faq_intents.most_common(15)
    ]
    bwana_cost, bwana_requests = _bwana_llm_usage(supabase, since)
    return BwanaAnalyticsSummary(
        period_days=days,
        total_messages=total_messages,
        total_escalations=total_escalations,
        escalation_rate_percent=rate,
        messages_by_source=dict(by_source),
        escalations_by_reason=dict(by_reason),
        top_faq_intents=top_faq,
        unique_sessions=len(sessions),
        faq_turns=int(by_source.get("faq", 0)),
        llm_turns=int(by_source.get("llm", 0)),
        escalated_turns=int(by_source.get("escalated", 0)),
        bwana_llm_cost_usd=bwana_cost,
        bwana_llm_requests=bwana_requests,
        pipeline_mode=pipeline_mode,  # type: ignore[arg-type]
        n8n_fallback_events=None,
        analytics_source="live",
    )
