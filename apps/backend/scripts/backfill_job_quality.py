#!/usr/bin/env python3
"""Backfill job quality normalization and optional deactivation (migration 073).

Usage (from apps/backend with .env loaded):
  python3 -m scripts.backfill_job_quality --dry-run
  python3 -m scripts.backfill_job_quality --apply
"""
from __future__ import annotations

import argparse
import os
import sys
from collections import Counter

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.environ.setdefault("JWT_SECRET", "unused-by-backfill-scripts")

from app.core.config import get_settings  # noqa: E402
from app.services.job_quality import apply_ingest_quality_to_job_data  # noqa: E402
from supabase import create_client  # noqa: E402


def _would_deactivate(row: dict, patch: dict) -> str | None:
    reason = patch.get("deactivation_reason")
    if reason and row.get("is_active"):
        return str(reason)
    return None


def run(*, apply: bool) -> None:
    settings = get_settings()
    supabase = create_client(settings.supabase_url, settings.supabase_key)

    rows = (
        supabase.table("jobs")
        .select(
            "id, title, company, description, source_url, apply_url, "
            "contact_phone, is_active, deactivation_reason"
        )
        .eq("is_active", True)
        .execute()
        .data
        or []
    )

    deactivate_counts: Counter[str] = Counter()
    updated = 0
    would_deactivate = 0

    for row in rows:
        patch: dict = {
            "description": row.get("description"),
            "source_url": row.get("source_url"),
            "apply_url": row.get("apply_url"),
            "contact_phone": row.get("contact_phone"),
        }

        original_phone = row.get("contact_phone")
        apply_ingest_quality_to_job_data(
            patch, original_contact_phone=original_phone
        )

        deact = _would_deactivate(row, patch)
        if deact:
            would_deactivate += 1
            for part in deact.split(","):
                deactivate_counts[part.strip()] += 1

        if apply:
            supabase.table("jobs").update(patch).eq("id", row["id"]).execute()
            updated += 1
        elif deact:
            print(f"[dry-run] deactivate {row['id']}: {deact}")

    print(f"Scanned {len(rows)} active jobs")
    print(f"Would deactivate: {would_deactivate}")
    for reason, count in deactivate_counts.most_common():
        print(f"  {reason}: {count}")
    print(f"Updated rows: {updated} (apply={apply})")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--dry-run", action="store_true")
    group.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    run(apply=args.apply)


if __name__ == "__main__":
    main()
