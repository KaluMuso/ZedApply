"""Daily LLM spend/token caps checked against llm_usage_log (SECURITY_AUDIT H3/H6)."""
from __future__ import annotations

import logging
from datetime import datetime, timezone

from supabase import Client

from app.core.config import get_settings
from app.core.deps import get_supabase

logger = logging.getLogger(__name__)


class LLMDailyCapExceeded(Exception):
    """Raised when today's logged usage exceeds configured caps."""


def _utc_today_start_iso() -> str:
    return (
        datetime.now(timezone.utc)
        .replace(hour=0, minute=0, second=0, microsecond=0)
        .isoformat()
    )


def _rollup_today_usage(supabase: Client) -> tuple[float, int]:
    """Return (sum cost_usd, sum prompt+completion tokens) for today UTC."""
    res = (
        supabase.table("llm_usage_log")
        .select("prompt_tokens, completion_tokens, cost_usd")
        .gte("created_at", _utc_today_start_iso())
        .execute()
    )
    total_usd = 0.0
    total_tokens = 0
    for row in res.data or []:
        if not isinstance(row, dict):
            continue
        total_usd += float(row.get("cost_usd") or 0)
        total_tokens += int(row.get("prompt_tokens") or 0)
        total_tokens += int(row.get("completion_tokens") or 0)
    return total_usd, total_tokens


def assert_llm_daily_budget(supabase: Client | None = None) -> None:
    """Block new LLM calls when daily caps are exceeded. No-op when caps are 0."""
    settings = get_settings()
    cap_usd = float(settings.llm_daily_spend_cap_usd or 0)
    cap_tokens = int(settings.llm_daily_token_cap or 0)
    if cap_usd <= 0 and cap_tokens <= 0:
        return

    client = supabase
    if client is None:
        try:
            client = get_supabase()
        except Exception:
            logger.warning("llm_daily_cap: skip check (no supabase client)")
            return

    try:
        spent_usd, spent_tokens = _rollup_today_usage(client)
    except Exception as exc:
        logger.warning("llm_daily_cap: rollup failed: %s", exc)
        return

    if cap_usd > 0 and spent_usd >= cap_usd:
        logger.error(
            "llm_daily_cap exceeded: spent_usd=%.6f cap_usd=%.6f",
            spent_usd,
            cap_usd,
        )
        raise LLMDailyCapExceeded(
            "Daily AI usage limit reached. Please try again tomorrow."
        )

    if cap_tokens > 0 and spent_tokens >= cap_tokens:
        logger.error(
            "llm_daily_cap exceeded: spent_tokens=%s cap_tokens=%s",
            spent_tokens,
            cap_tokens,
        )
        raise LLMDailyCapExceeded(
            "Daily AI usage limit reached. Please try again tomorrow."
        )
