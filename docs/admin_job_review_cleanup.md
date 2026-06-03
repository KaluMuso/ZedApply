# Admin job review queue — auto-hide vs needs review

## Customer visibility (`/jobs`, `/matches`)

A job is **publicly listable** when all of the following hold (`app/services/job_publication.py`):

| Rule | Field / check |
|------|----------------|
| Not soft-deleted | `is_active = true` |
| Cleared review gate | `is_review_required = false` |
| Apply path (unless force-published) | `apply_url`, `apply_email`, or `contact_phone` present, **or** `admin_published = true` |

The public jobs API also filters `is_review_required = false`. The `match_jobs_for_user` RPC excludes `is_review_required` rows.

## Ingest auto-hide (no admin queue)

On scraper/manual ingest, `apply_ingest_quality_to_job_data` may set `is_active = false` and `deactivation_reason` without entering review:

| Reason | Trigger |
|--------|---------|
| `missing_source_url` | No usable `source_url` / `apply_url` after sanitization |
| `aggregator_root_url` | Listing URL is a job-board homepage, not a vacancy |
| `thin_description` | Description shorter than 300 chars (when no apply URL) |
| Invalid phone cleared | `contact_phone` present but fails ZM E.164 normalization |

These rows are **hidden immediately**; they may still get `is_review_required` from Track 4e if deadline/apply rules also fail.

## Review queue (`is_review_required = true`)

Set by `compute_review_state` (`app/services/job_activation.py`) on ingest and deep-enrich:

| `review_reason` | Meaning | Typical `is_active` |
|-----------------|---------|---------------------|
| `no_apply_path` | No apply URL, email, or phone | `false` |
| `no_deadline` | No `closing_date` | `true` if apply path exists |
| `both` | Missing apply path **and** deadline | `false` |

Legacy `admin_review_reason` mirrors these for older admin UI paths.

### Needs manual admin work

- **`no_deadline`** with apply path present — add `closing_date` or run deadline backfill (`scripts/backfill_deadline_extraction.py`).
- **`no_apply_path`** with rich description — extract contacts (`backfill_description_extraction.py`) or deep-enrich tick.
- Suspected **duplicates** — `POST /admin/review-jobs/bulk-mark-duplicate`.
- Junk listings — `POST /admin/review-jobs/bulk-permanently-inactive` or dismiss on legacy queue.

### Safe to auto-dismiss (hidden backlog)

Jobs that are **already not customer-visible** and cannot be published without new data:

```
is_review_required = true
AND admin_reviewed_at IS NULL
AND is_active = false
AND review_reason IN ('both', 'no_apply_path')
```

Action: `POST /admin/review-jobs/bulk-auto-dismiss-hidden` or:

```bash
cd apps/backend
python3 scripts/batch_dismiss_hidden_review_queue.py --dry-run
python3 scripts/batch_dismiss_hidden_review_queue.py --apply
```

Sets `is_review_required = false`, `review_reason = auto_dismissed_hidden`, `admin_reviewed_at = now()`. **Idempotent** — re-run updates 0 rows.

Does **not** dismiss `no_deadline` rows (may only need a date) or `is_active = true` rows.

## Expired jobs

`deactivate_expired_jobs()` (cron + `POST /admin/jobs/bulk-deactivate` with `expired_only=true`) sets `is_active = false` when `closing_date < today`. Review flags are unchanged; run auto-dismiss after expiry sweeps if the queue grows.

## Ops snapshot (2026-06-03 prod)

| Metric | Count |
|--------|------:|
| Need review (unreviewed) | 517 |
| Already inactive in queue | 471 |
| Auto-dismiss eligible (`both` / `no_apply_path` + inactive) | 446 |
| Active but missing deadline only | 47 |

Sample ingest issues: scraper batches (e.g. Mulungushi University) with `review_reason=both`, `quality_score=35`, no apply channels — hidden from users but still counted in admin “need review”.

## Related endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /admin/review-jobs` | Track 4e queue (`is_review_required`) |
| `GET /admin/jobs/review-queue` | Legacy queue (`admin_review_reason`) |
| `POST /admin/review-jobs/bulk-auto-dismiss-hidden` | Clear hidden backlog |
| `POST /admin/jobs/bulk-deactivate?expired_only=true` | Expire by `closing_date` |
| `GET /admin/stats` | `jobs_need_review`, `jobs_deactivated` |
