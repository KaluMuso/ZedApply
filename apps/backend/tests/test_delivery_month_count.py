"""Delivery month counting — Africa/Lusaka calendar window."""
import asyncio
from datetime import datetime, timezone, timedelta
from zoneinfo import ZoneInfo

import pytest

from app.services.matching import (
    _billing_period_start,
    get_credited_match_count,
)
from tests.test_track4b import MemorySupabase


@pytest.mark.asyncio
async def test_dismissed_matches_not_counted_toward_delivery():
    now = datetime(2026, 6, 3, 12, 0, tzinfo=timezone.utc)
    month_start = (
        now.astimezone(ZoneInfo("Africa/Lusaka"))
        .replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        .astimezone(timezone.utc)
    )
    supabase = MemorySupabase(
        {
            "matches": [
                {
                    "id": "m1",
                    "user_id": "u1",
                    "job_id": "j1",
                    "score": 90,
                    "status": "new",
                    "credited_at": now.isoformat(),
                },
                {
                    "id": "m2",
                    "user_id": "u1",
                    "job_id": "j2",
                    "score": 85,
                    "status": "dismissed",
                    "credited_at": now.isoformat(),
                },
            ],
        }
    )
    count = await get_credited_match_count("u1", supabase, now=now)
    assert count == 1

    period = await _billing_period_start("u1", supabase, now=now)
    assert period == month_start


@pytest.mark.asyncio
async def test_credits_before_lusaka_month_start_excluded():
    now = datetime(2026, 6, 3, 12, 0, tzinfo=timezone.utc)
    month_start = (
        now.astimezone(ZoneInfo("Africa/Lusaka"))
        .replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        .astimezone(timezone.utc)
    )
    before_month = (month_start - timedelta(hours=2)).isoformat()
    supabase = MemorySupabase(
        {
            "matches": [
                {
                    "id": "m1",
                    "user_id": "u1",
                    "job_id": "j1",
                    "score": 90,
                    "status": "new",
                    "credited_at": before_month,
                },
                {
                    "id": "m2",
                    "user_id": "u1",
                    "job_id": "j2",
                    "score": 88,
                    "status": "new",
                    "credited_at": now.isoformat(),
                },
            ],
        }
    )
    count = await get_credited_match_count("u1", supabase, now=now)
    assert count == 1
