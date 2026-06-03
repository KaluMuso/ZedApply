# Review queue — safe bulk clear (prod)

**Depends on:** [#256](https://github.com/vergeo/ZedCV/pull/256) merged to `master` (`POST /admin/review-jobs/bulk-dismiss-safe`, `GET /admin/review-jobs/overview`).

**Criteria reference:** [admin_job_review_cleanup.md](admin_job_review_cleanup.md) — inactive + no contact + not on `/jobs`; **never delete rows**, only clear `is_review_required` / set `admin_reviewed_at`.

**Who runs this:** A human operator **after** backend deploy. **Not** wired into CI or n8n — no automatic prod execution.

---

## What gets cleared (safe dismiss)

`POST /api/v1/admin/review-jobs/bulk-dismiss-safe` runs three idempotent passes (same rules as the admin UI “Dismiss safe backlog”):

| Pass | Eligible when | Sets `review_reason` to |
|------|----------------|-------------------------|
| Hidden | `is_active=false`, pending review, `review_reason` ∈ `both`, `no_apply_path` | `auto_dismissed_hidden` |
| Expired | `closing_date` &lt; today, still in queue | `auto_dismissed_expired` |
| Junk | `is_active=false`, `deactivation_reason` matches thin description / bad URL markers | `auto_dismissed_junk` |

Does **not** dismiss `no_deadline` rows that are still `is_active=true` (they may only need a `closing_date`). Does **not** change `quality_score` or hard-delete jobs.

---

## Prod snapshot (2026-06-03)

| Metric | Count |
|--------|------:|
| Need review (`need_review`) | 517 |
| Safe hidden eligible (`auto_dismiss_hidden_eligible`) | 446 |
| **Expected after safe dismiss** | **~71** still need manual review |

Re-check counts with `GET /admin/review-jobs/overview` before and after; prod drift is normal as ingest continues.

---

## Prerequisites

| Check | How |
|-------|-----|
| #256 deployed on OCI | `curl -sS -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer $ADMIN_JWT" "$API_URL/admin/review-jobs/overview"` → `200` |
| Admin JWT | Sign in at https://www.zedapply.com/admin as `admin` / `superadmin`; copy session token (browser: `localStorage.zed_cv_token`) into `ADMIN_JWT`. **Do not** use `ADMIN_API_KEY` — these routes require `require_admin` Bearer JWT. |
| Backend healthy | `GET /api/v1/health` → `status` not blocked by deploy |

---

## Procedure

### 1. Baseline overview

```bash
export API_URL="${API_URL:-https://api.zedapply.com/api/v1}"
export ADMIN_JWT="<paste admin session JWT>"

curl -sS "$API_URL/admin/review-jobs/overview" \
  -H "Authorization: Bearer $ADMIN_JWT" | jq .
```

Expect `need_review` ≈ 517 and `auto_dismiss_hidden_eligible` ≈ 446 pre-clear (see table above).

Optional: `GET /api/v1/admin/stats` → `jobs_need_review` should track the same backlog.

### 2. Dry run (no writes)

```bash
curl -sS -X POST "$API_URL/admin/review-jobs/bulk-dismiss-safe" \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{"dry_run": true}' | jq .
```

Expect `dry_run: true`, `hidden_eligible` ≈ 446, `hidden_dismissed: 0`, plus any `expired_*` / `junk_*` eligible counts. **Stop** if eligible counts are wildly different from overview without explanation (ingest in progress is OK; zero when overview shows hundreds is not).

Helper script (same calls):

```bash
export ADMIN_JWT="..."
export API_URL="https://api.zedapply.com/api/v1"
export DRY_RUN=true
./scripts/admin_review_queue_dry_run.sh
```

### 3. Apply (prod write)

Only after dry-run numbers look right:

```bash
curl -sS -X POST "$API_URL/admin/review-jobs/bulk-dismiss-safe" \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{"dry_run": false}' | jq .
```

Expect non-zero `hidden_dismissed` (and any expired/junk dismissed). Re-run overview:

```bash
curl -sS "$API_URL/admin/review-jobs/overview" \
  -H "Authorization: Bearer $ADMIN_JWT" | jq .
```

Target: `need_review` ≈ **71** (± ingest). Rows left typically need deadline, apply-path extraction, or duplicate/junk decisions — see [admin_job_review_cleanup.md § Needs manual admin work](admin_job_review_cleanup.md).

### 4. Legacy: hidden-only endpoint (optional)

Prefer **bulk-dismiss-safe** (one call, hidden + expired + junk). Use the legacy endpoint only if you intentionally want the hidden pass alone:

```bash
curl -sS -X POST "$API_URL/admin/review-jobs/bulk-auto-dismiss-hidden" \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{"dry_run": true}' | jq .

# apply:
curl -sS -X POST "$API_URL/admin/review-jobs/bulk-auto-dismiss-hidden" \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{"dry_run": false}' | jq .
```

CLI equivalent (runs inside backend container with service role — same hidden criteria, not expired/junk):

```bash
docker exec -it zedcv-backend python3 scripts/batch_dismiss_hidden_review_queue.py --dry-run
docker exec -it zedcv-backend python3 scripts/batch_dismiss_hidden_review_queue.py --apply
```

---

## Rollback

There is **no** bulk “undo”. Re-queue would require per-job SQL or manual PATCH on `/admin/review-jobs/{job_id}`. For that reason, always dry-run first and spot-check a few dismissed titles in admin UI before apply.

---

## Related

| Doc | Purpose |
|-----|---------|
| [admin_job_review_cleanup.md](admin_job_review_cleanup.md) | Full criteria table, customer visibility rules |
| [admin_alerts.md](admin_alerts.md) | Review queue WhatsApp alert cron |
| [RUNBOOK_INDEX.md](RUNBOOK_INDEX.md) | Ops index |
| [openapi.yaml](openapi.yaml) | Request/response schemas |
