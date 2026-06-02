# Staging environment guide

Use staging to validate migrations, payment sandboxes, and frontend changes **before** production cutover. This document describes setup only — it does not provision cloud resources automatically.

**Related:** [DEPLOY.md](../DEPLOY.md) (production), [production_cutover.md](production_cutover.md), [DEPLOYMENT_READINESS_CHECKLIST.md](../DEPLOYMENT_READINESS_CHECKLIST.md), [RUNBOOK_INDEX.md](RUNBOOK_INDEX.md).

---

## Goals

| Goal | Staging approach |
|------|------------------|
| Schema parity with prod | Supabase **branch** or fresh project + full migration chain |
| Safe payments | Lenco **sandbox** + DPO test merchant |
| No user PII bleed | Separate DB; never copy prod `users`/`cvs` rows with real phones |
| Cheap | One Supabase branch (included on Pro) or second free project; Vercel **Preview** deploys |

---

## Option A — Supabase branch (recommended on Pro)

Best when production is on Supabase **Pro** and you need prod-like data shape without touching prod.

1. Supabase Dashboard → project `chnesgmcuxyhwhzomdov` → **Branches** → **Create branch**.
2. Name e.g. `staging` or `preview-<feature>`.
3. Note branch-specific **URL** and **service_role** / **anon** keys (they differ from prod).
4. Apply any migrations that exist on `master` but not yet on the branch:
   - SQL Editor: run files from `infra/supabase/migrations/` in numeric order, **or**
   - `supabase link` + `supabase db push` against the branch project ref.
5. Do **not** run destructive scripts (`backfill_* --apply`) until smoke-tested on a copy.

**Merge back:** use Supabase branch merge UI only after review; prefer forward-applying the same SQL on prod instead of merging experimental DDL.

**Restore drill:** see [disaster_recovery.md](disaster_recovery.md) — create a branch from backup snapshot and verify row counts on `users`, `jobs`, `cvs`.

---

## Option B — Second Supabase project (free tier)

Use when Pro branches are unavailable. Creates an isolated database at zero extra Supabase cost (separate 7-day pause clock — keep [heartbeat](../infra/n8n/heartbeat_workflow.json) on this project too).

1. Create a new project (e.g. `zedcv-staging`) in the same region (`eu-west-2`).
2. Enable **pgvector** extension.
3. Apply full migration chain `001` → latest (`088_employer_rls_policies.sql` as of 2026-05).
4. Seed minimal data: a few `jobs`, one test user, one CV — do not import prod dumps with real phone numbers.

---

## Option C — Local only (fastest)

For API/frontend dev without cloud staging DB:

```bash
# Backend
cd apps/backend && cp .env.example .env   # point SUPABASE_* at staging branch or local stack
uvicorn main:app --reload --port 8000

# Frontend
cd apps/frontend && cp .env.example .env.local
# NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
npm run dev
```

Run `pytest apps/backend/tests/` and `npm test` — no real WAHA/Resend required (mocked).

---

## Deploy targets

| Layer | Staging pattern | Notes |
|-------|-----------------|-------|
| **Database** | Supabase branch or second project | Keys must match backend `SUPABASE_URL` / `SUPABASE_KEY` |
| **Backend** | Same OCI VM with staging `.env` **or** separate preview container | Prefer separate compose project dir to avoid overwriting prod `.env` |
| **Frontend** | Vercel **Preview** for PR branches | Set preview env vars (below); `NEXT_PUBLIC_API_URL` → staging API host |
| **WAHA** | Shared prod session **or** separate WAHA on staging | OTP to real phones if shared — use test numbers only |
| **n8n** | Duplicate workflows with `FASTAPI_URL` → staging API | See [infra/n8n/README.md](../infra/n8n/README.md) ingest key rotation |

**DNS (optional):** `staging-api.zedapply.com` → staging backend; `staging.zedapply.com` → Vercel preview alias.

---

## Environment variable matrix

### Backend (OCI / Docker / local `apps/backend/.env`)

| Variable | Staging typical | Production |
|----------|-----------------|------------|
| `SUPABASE_URL` | Branch / staging project URL | `https://chnesgmcuxyhwhzomdov.supabase.co` |
| `SUPABASE_KEY` | Staging **service_role** | Prod service_role |
| `GEMINI_API_KEY` | Same or dedicated quota key | Prod key |
| `OPENROUTER_API_KEY` | Same | Prod |
| `JWT_SECRET` | **Different** from prod | Prod secret |
| `DEBUG` | `true` acceptable | `false` |
| `SENTRY_ENVIRONMENT` | `staging` | `production` |
| `LENCO_ENVIRONMENT` | `sandbox` | `production` |
| `LENCO_API_URL` | `https://sandbox.lenco.co/access/v2` | `https://api.lenco.co/access/v2/` |
| `LENCO_VERIFY_SIGNATURES` | `true` (sandbox keys) | `true` |
| `RESEND_API_KEY` | Same or Resend test mode | Prod |
| `RESEND_FROM_EMAIL` | Verified domain only | `Zed CV <info@vergeo.company>` |
| `WAHA_API_URL` | Internal Docker or staging WAHA | `http://waha:3000` (prod compose) |
| `INGEST_API_KEY` | **Unique** staging secret | Prod ingest key |
| `ADMIN_API_KEY` | **Unique** staging secret | Prod admin key |
| `APP_URL` | Preview/staging site URL | `https://www.zedapply.com` |
| `REDIS_URL` | Optional separate Upstash DB | Prod Upstash |
| `VAPID_*` | Can share or use test pair | Prod pair (must match frontend public key) |

Canonical list: [apps/backend/.env.example](../apps/backend/.env.example).

### Frontend (Vercel — Preview environment)

| Variable | Staging | Production |
|----------|---------|------------|
| `NEXT_PUBLIC_API_URL` | `https://<staging-api>/api/v1` | `https://api.zedapply.com/api/v1` |
| `NEXT_PUBLIC_SUPABASE_URL` | Staging Supabase URL | Prod URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Staging anon key | Prod anon |
| `NEXT_PUBLIC_LENCO_PUBLIC_KEY` | Sandbox `pub-...` | Production `pub-...` |
| `NEXT_PUBLIC_LENCO_WIDGET_URL` | `https://pay.sandbox.lenco.co/js/v1/inline.js` | `https://pay.lenco.co/js/v1/inline.js` |
| `NEXT_PUBLIC_SENTRY_ENVIRONMENT` | `staging` | `production` |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Must match staging backend `VAPID_PUBLIC_KEY` | Prod public key |
| `SENTRY_ENVIRONMENT` | `staging` (server builds) | `production` |

Canonical list: [apps/frontend/.env.example](../apps/frontend/.env.example).

**After any OCI `.env` change:** `docker compose up -d --force-recreate zedcv-backend` (not `restart` alone). See [AGENTS.md](../AGENTS.md) §3.5.

---

## Staging smoke checklist

Run after deploy or migration apply. All commands assume staging API base `$API`.

| # | Check | Command / action | Pass |
|---|--------|------------------|------|
| 1 | Health | `curl -s $API/health \| jq .` | `status` healthy or degraded with known flags; `supabase: true` |
| 2 | Migrations | `cd apps/backend && python scripts/production_readiness_audit.py` | No red migration sentinels for 074–088 |
| 3 | Auth OTP | Request WhatsApp or email OTP for **test** `+260…` | 200, no CORS mask (if CORS error, see [AGENTS.md](../AGENTS.md) §3.1) |
| 4 | CV upload | PDF &lt; 5MB | Parse succeeds; `vector_dims(embedding)` = 768 |
| 5 | Matches | `GET /matches` as test user | Scores present; not all zero (embedding model drift if zero) |
| 6 | Lenco | K10 sandbox payment on `/pricing` | Tier updates; refund in sandbox dashboard |
| 7 | Email | Signup / OTP email | Resend `delivered`; `GET /admin/email-health` → `domain_verified: true` |
| 8 | WAHA | `GET /health` → `waha: true` or bootstrap | [AGENTS.md](../AGENTS.md) §3.3 |
| 9 | Ingest | n8n job scraper or `POST /jobs/ingest` with staging `INGEST_API_KEY` | 200, job row created |
| 10 | Frontend | Open preview URL | Login, `/matches`, `/pricing` widget loads |

**Embedding sanity (SQL on staging):**

```sql
SELECT vector_dims(embedding) AS dim, COUNT(*) FROM jobs WHERE embedding IS NOT NULL GROUP BY 1;
SELECT vector_dims(embedding) AS dim, COUNT(*) FROM cvs WHERE embedding IS NOT NULL GROUP BY 1;
```

Expect **768** for both. Mismatch or wrong model → `POST /admin/re-embed?target=all` (admin key).

---

## What not to do on staging

- Point staging frontend at **production** `SUPABASE_URL` with anon key (RLS bypass risk on misconfigured routes).
- Run `backfill_apply_urls_v2.py --apply` against prod from a laptop.
- Share `INGEST_API_KEY` / `ADMIN_API_KEY` between staging and prod.
- Disable the Supabase heartbeat workflow on any free-tier project.

---

## Promotion to production

1. Merge code to `master`.
2. Apply pending migrations on prod ([migrations.md](migrations.md), [production_cutover.md](production_cutover.md)).
3. OCI: `git pull` → `docker compose build zedcv-backend` → `force-recreate`.
4. Vercel: production deploy without build cache after env changes.
5. Run production smoke from [DEPLOYMENT_READINESS_CHECKLIST.md](../DEPLOYMENT_READINESS_CHECKLIST.md).
