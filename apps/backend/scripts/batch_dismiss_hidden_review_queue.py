#!/usr/bin/env python3
"""Dismiss review-queue rows that are already hidden from customers.

See docs/admin_job_review_cleanup.md.

Usage (from apps/backend with .env loaded):
  python3 scripts/batch_dismiss_hidden_review_queue.py --dry-run
  python3 scripts/batch_dismiss_hidden_review_queue.py --apply [--limit N]
"""
from __future__ import annotations

import argparse
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.core.config import get_settings  # noqa: E402
from app.services.review_queue_cleanup import (  # noqa: E402
    AUTO_DISMISS_REVIEW_REASONS,
    build_hidden_inactive_dismiss_patch,
)
from supabase import create_client  # noqa: E402


def run(*, dry_run: bool, limit: int) -> None:
    settings = get_settings()
    supabase = create_client(settings.supabase_url, settings.supabase_key)

    count_res = (
        supabase.table("jobs")
        .select("id", count="exact")
        .eq("is_review_required", True)
        .is_("admin_reviewed_at", "null")
        .eq("is_active", False)
        .in_("review_reason", list(AUTO_DISMISS_REVIEW_REASONS))
        .execute()
    )
    eligible = count_res.count or 0
    print(f"Eligible for auto-dismiss: {eligible}")

    if dry_run or eligible == 0:
        print(f"Done (dry_run={dry_run}, dismissed=0)")
        return

    patch = build_hidden_inactive_dismiss_patch()
    dismissed = 0
    while dismissed < limit:
        batch = (
            supabase.table("jobs")
            .select("id")
            .eq("is_review_required", True)
            .is_("admin_reviewed_at", "null")
            .eq("is_active", False)
            .in_("review_reason", list(AUTO_DISMISS_REVIEW_REASONS))
            .limit(min(500, limit - dismissed))
            .execute()
        )
        ids = [r["id"] for r in (batch.data or [])]
        if not ids:
            break
        supabase.table("jobs").update(patch).in_("id", ids).execute()
        dismissed += len(ids)
    print(f"Dismissed {dismissed} job(s)")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Apply updates (default is dry-run)",
    )
    parser.add_argument("--limit", type=int, default=2000)
    args = parser.parse_args()
    run(dry_run=not args.apply, limit=args.limit)


if __name__ == "__main__":
    main()
