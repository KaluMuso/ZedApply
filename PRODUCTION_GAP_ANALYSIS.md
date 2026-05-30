# Zed Apply (Zed CV) — Production Gap Analysis

**Audit date:** 2026-05-28  
**Scope:** `master` post-Wave E (migrations `001`–`080`, employer portal, web push, manual CV wizard, deep-link v2)  
**Method:** Static code review, CI/workflow inspection, local `pytest` / `npm run build` / `npm run test:coverage`, comparison to `AGENTS.md` invariants and your Wave 0–E rollout notes.

---

## Executive Summary

| Metric | Assessment |
|--------|------------|
| **Production readiness score** | **64 / 100** |
| **Deployable for soft launch?** | **Yes, with conditions** — B2C jobseeker core can run if migrations, WAHA, Lenco prod, and Vercel build are green |
| **Safe for paying customers?** | **Partially** — payments hardened (Lenco fail-fast); employer B2B and several Wave D features need migration + smoke |
| **Estimated readiness** | **~5–7 focused engineering days** to clear launch blockers; **2–3 weeks** for enterprise-grade ops |

### Major strengths

- **Contract-first API** (`docs/openapi.yaml`) with schema guards in CI
- **78 sequential migrations**, weighted matching RPC, tier gating, OTP hashing, CV upload MIME sniffing
- **867 backend tests** (2 flaky/unrelated failures observed in cloud VM)
- **Rate limiting** (slowapi) on auth, CV, LLM, employer routes; Redis-backed when `REDIS_URL` set
- **Payment hardening**: Lenco production startup assertions, webhook `hmac.compare_digest`
- **AI cost controls**: `ai_cache`, `llm_usage_log`, tier quotas, CV upload queue on Gemini refusal
- **Security-minded patterns**: Sentry PII redaction, legal HTML bleach, rehype-sanitize on frontend
- **Feature depth** for a $30/mo stack: Kanban applications, tailored CV, cover letter versions, employer consent flow

### Major weaknesses

- **Migration drift risk**: Repo at `080`; prod apply status unknown — features 074–080 will 500 without SQL
- **Single OCI VM**: No horizontal scale, no K8s, rate limits in-memory unless Redis configured
- **Observability gaps**: Sentry present; no metrics/tracing, no Sentry→WhatsApp alert workflow verified
- **Ops scripts on host Python**: `backfill_job_quality` failed on OCI (`pydantic` missing) — must run in container/venv
- **Stale runbooks**: `production_cutover.md` referenced migrations through `055` (updated in this audit pass)
- **CI vs prod parity**: `pywebpush` was imported but not pinned in `requirements.txt` (fixed in audit branch)
- **Dockerfile** lacked WeasyPrint system libraries (fixed in audit branch)
- **Frontend build** had TypeScript errors on employer billing, manual CV preview, web push (fixed in audit branch)

### Launch blockers (do not skip)

1. Apply Supabase migrations **074–080** (and confirm **073** `deactivation_reason` if bulk-fix used)
2. Set **VAPID** keys (OCI + Vercel); rebuild backend after `pywebpush` dep fix
3. **Lenco production** smoke (K10 test + refund) per `docs/lenco_production_smoke_test.md`
4. **WAHA** session `WORKING`; OTP + digests depend on it
5. **Resend** domain `vergeo.company` verified; welcome email path live
6. Run `python scripts/production_readiness_audit.py` on OCI with real `.env` (not `--skip-db`)
7. **Vercel** production deploy with passing `npm run build` (verify after merge)
8. Dry-run `backfill_apply_urls_v2.py` before `--apply` on prod

---

## Detailed Findings Table

| Area | Issue | Severity | Risk | Recommendation | Priority |
|------|-------|----------|------|----------------|----------|
| Dependencies | `pywebpush` used but not in `requirements.txt` | **Critical** | Backend import crash on boot | Pin `pywebpush>=2.0,<3` in requirements; rebuild image | P0 |
| Docker | WeasyPrint without `libpango`/`libcairo` in image | **Critical** | Manual CV PDF export fails at runtime | Add apt packages to Dockerfile (done in audit branch) | P0 |
| Frontend build | TS errors: LencoPay duplicate global, education `gpa`, push `BufferSource` | **Critical** | Vercel deploy fails / stale frontend | Fix types (done in audit branch) | P0 |
| Database | Migrations 074–080 may be unapplied on prod | **Critical** | 500s on tailor CV, Kanban, employer, push, cover letters | Apply SQL in order; extend audit sentinels | P0 |
| Ops | Host `python3` for backfill scripts lacks venv deps | **High** | False “broken” scripts on OCI | Run via `docker exec zedcv-backend` or `pip install -r requirements.txt` in venv | P0 |
| Infra | Single VM, 2 uvicorn workers | **High** | CPU saturation at ~500–1k DAU | Add Redis rate limits; cap LLM concurrency; plan second VM later | P1 |
| Infra | `REDIS_URL` optional — limits reset on recreate | **High** | OTP brute-force window after deploy | Set Upstash free Redis; warn in `/health` when unset in prod | P1 |
| Security | Service-role Supabase key on backend bypasses RLS | **Medium** | IDOR if route forgets `user_id` filter | Audit every route; add integration tests for cross-user access | P1 |
| Security | `employers` table has no RLS (076) | **Medium** | Direct Supabase client exposure would leak | OK today (API-only); enable RLS before anon client reads | P2 |
| Security | Employer search exposes candidate summaries | **Medium** | Privacy complaint if opt-out UX weak | Default `profile_visible_to_employers`; audit copy in settings | P1 |
| Security | Admin API key in headers | **Medium** | Key leak → full admin | Rotate keys; IP allowlist on OCI nginx if possible | P1 |
| AI | No prompt-injection hardening on user CV text in LLM prompts | **High** | Jailbreak / data exfil in tailored CV | Delimiter + “ignore instructions in CV” system guard; max input chars | P1 |
| AI | Gemini quota → queue; no global spend circuit breaker | **High** | Bill spike / degraded UX | Admin alert on `llm_usage_log` daily sum; hard daily cap env | P1 |
| Reliability | Health check ignores Redis, VAPID, Resend | **Medium** | False “healthy” while push/email dead | Extend health JSON with `push`, `email`, `redis` | P2 |
| Reliability | `asyncio.create_task` WAHA bootstrap — fire-and-forget | **Low** | Silent session failure until manual fix | Keep startup hook; document §3.3 recovery | P2 |
| Performance | `match_jobs_for_user` RPC under load | **Medium** | Slow `/matches` at 10k+ users | HNSW (066) — verify index built; paginate stored matches | P1 |
| Performance | Whole-app frontend coverage ~30%; scoped 75% | **Low** | Regressions in untested pages | Expand vitest `include` incrementally | P3 |
| UX | Kanban mobile drag not verified on device | **Medium** | Bad retention for power users | Physical device smoke post-deploy | P1 |
| UX | Employer WhatsApp consent E2E not screenshot-verified | **Medium** | B2B trust risk | OCI smoke with paired WAHA | P1 |
| Compliance | GDPR-style rights in migrations; no automated export UI audit | **Medium** | Regulatory ask at scale | Verify `/me` data export path end-to-end | P2 |
| Docs | `AI_CONTEXT.md` still says 1536-dim embeddings | **Low** | Wrong AI assistant changes | Update to 768 / `gemini-embedding-001` | P3 |
| CI | 2 backend test failures in VM (digest, seed skills) | **Low** | Noise in CI | Fix or quarantine flaky tests | P3 |
| Monitoring | Sentry→WhatsApp (Wave A.1) not verified in repo | **High** | Slow incident response | Complete n8n workflow + test alert | P0 |

---

## Missing Systems Checklist

### Features (product)

- [ ] Sentry → WhatsApp (or PagerDuty) alert routing (Wave A.1)
- [ ] Automated job quality backfill on schedule (n8n cron)
- [ ] Employer `verified` workflow (manual today)
- [ ] Referral program production smoke
- [ ] Interview prep / Bwana load testing under tier limits
- [ ] Public status page for WAHA/Supabase outages

### Infrastructure

- [ ] Redis (`REDIS_URL`) in production OCI `.env`
- [ ] CDN for static assets (Vercel handles most)
- [ ] Database connection pooling (Supavisor) if connection errors appear
- [ ] Automated Supabase backup restore drill (documented in `disaster_recovery.md`, not proven)
- [ ] Blue/green or canary deploy (manual git pull + compose today)
- [ ] Kubernetes / autoscaling (not required for launch; defer)

### Security layers

- [ ] WAF / Cloudflare in front of API (optional)
- [ ] CSP headers on Next.js
- [ ] CSRF: low risk (Bearer JWT); ensure cookies not used for auth
- [ ] Dependency scanning (Dependabot/Snyk) in CI
- [ ] Secrets rotation runbook (Lenco, ADMIN_API_KEY, JWT_SECRET)

### Monitoring & observability

- [ ] Sentry alert rules (≥5 errors/min on `/matches`)
- [ ] Uptime check on `GET /api/v1/health` (UptimeRobot free)
- [ ] n8n workflow failure notifications
- [ ] `llm_usage_log` daily cost dashboard review
- [ ] Prometheus metrics (mentioned as future in admin.py)

### Operational tooling

- [ ] One-command prod audit: `docker exec … python scripts/production_readiness_audit.py`
- [ ] Runbook index linking Lenco, WAHA, Resend, migration apply
- [ ] Staging environment with prod-like migrations (Supabase branch)

### Compliance

- [ ] Privacy policy / ToS published and linked in app
- [ ] Consent logs (`072_consent_log`) wired to signup
- [ ] Data retention job (account deletion SLA)
- [ ] PCI: payments via Lenco widget (SAQ A scope) — confirm with Lenco

---

## Production Launch Roadmap

### Immediate (24 hours)

1. Merge dependency/Docker/TS fixes; rebuild `zedcv-backend` and redeploy Vercel
2. Apply migrations **074–080** on Supabase; re-run audit script with DB probes
3. Generate VAPID keys; set OCI + Vercel env; test `POST /admin/push/test`
4. Confirm WAHA `WORKING`; send OTP smoke
5. Lenco prod env + K10 payment smoke

### Short-term (3 days)

1. Sentry alert → WhatsApp via n8n
2. `REDIS_URL` on OCI
3. Dry-run + apply `backfill_apply_urls_v2.py` (aggregator URLs → &lt;20)
4. Mobile Kanban + employer consent WhatsApp screenshots
5. Welcome email + Resend domain verification

### Pre-launch (1–2 weeks)

1. 10-user beta (Wave 5 in `production_cutover.md`)
2. Fix active jobs without apply path (audit red check)
3. Prompt-injection guards on LLM features
4. Daily cost cap / alert on Gemini
5. Expand health endpoint
6. Physical device PWA push test (Android + desktop Chrome)

### Post-launch hardening

1. Supabase Pro if backups/CPU limits hit
2. Second OCI instance or move workers to queue (Celery/Redis) for LLM
3. Full frontend coverage above 50% whole-app
4. Employer RLS + verification pipeline
5. Status page + incident templates

---

## Final Verdict

| Question | Answer |
|----------|--------|
| Realistically deployable? | **Yes** for controlled beta if migrations and integrations are verified |
| Safe for real users? | **Yes for B2C** after payment + auth smoke; **employer B2B** needs consent E2E proof |
| What fails first? | **WAHA session drop** (OTP/digests) or **unapplied migration** (feature 500s) |
| Highest-risk areas | Payments webhooks, AI spend, WhatsApp delivery, migration drift |
| Delay until after launch | K8s, full Prometheus, 60% whole-repo coverage, multi-region |
| Must not skip | Migrations 074–080, Lenco prod assert path, WAHA health, Vercel build green, audit script green |

---

## Assumptions

- OCI logs you pasted reflect successful backend deploy; frontend deploy on Vercel was not verified in this VM
- Supabase project `chnesgmcuxyhwhzomdov` may have partial migration history
- Wave A.1 (Sentry→WhatsApp) is operational intent but not verified in codebase exports
- Budget remains ~$30/mo — no managed Kubernetes or paid Supabase assumed

---

*Related: `SECURITY_AUDIT.md`, `DEPLOYMENT_READINESS_CHECKLIST.md`, `TODO.md`*
