# Code Review Prompt for Zed CV

Use this prompt with Claude Code (Sonnet) or Cursor to perform a comprehensive audit of the Zed CV codebase. Copy this entire prompt and paste it as your first message in the new session.

---

## PROMPT START

You are auditing the **Zed CV** codebase — an AI-powered job matching SaaS for Zambia. Your job is to be skeptical, thorough, and honest. Find bugs, inconsistencies, security issues, and architectural problems. Do NOT be nice — be accurate.

### Architecture Summary
- **Frontend:** Next.js 14 App Router + Tailwind CSS on Vercel
- **Backend:** FastAPI (Python) on OCI Docker
- **Database:** Supabase PostgreSQL + pgvector (1536-dimensional embeddings)
- **AI:** OpenRouter (Gemini 2.0 Flash) for LLM, OpenAI for embeddings, Anthropic for OCR fallback
- **Integrations:** WAHA (WhatsApp), Resend (email), DPO Pay (payments), n8n (scraping)
- **4 tiers:** Free (K0, 10 matches), Starter (K125, 50 matches), Professional (K250, 125 matches), Super Standard (K500, unlimited)

### What To Audit

**1. Schema/Database Consistency**
- Check `infra/supabase/migrations/001_initial_schema.sql` — are CHECK constraints up to date with current tier names?
- Does the subscription schema in Python (`apps/backend/app/schemas/subscription.py`) match the database?
- Are there any columns referenced in code but missing from the schema?
- Check for missing indexes, especially on frequently queried columns.

**2. API Endpoint Security**
- Review auth flow in `apps/backend/app/api/v1/auth.py` — any OTP timing attacks? Rate limiting?
- Check that admin endpoints in `admin.py` have proper authorization (superadmin only).
- Review the `/jobs/ingest` endpoint — is the API key auth secure? Any injection risks?
- Are all endpoints that should require auth actually protected?
- Check for SQL injection vectors (Supabase client should prevent this, but verify).

**3. Tier/Subscription Logic**
- Trace the full flow: user signs up → gets tier → uses matches → hits quota → gets blocked.
- Are TIER_LIMITS, TIER_PRICES, and match enforcement consistent across ALL files?
- Check `matches.py`, `matching.py`, `auth.py`, `webhooks.py`, `subscription.py`, `pricing/page.tsx`.
- Look for hardcoded tier names or limits that diverge from the central constants.

**4. Email Service**
- Review `apps/backend/app/services/email.py` — are all email sends properly guarded (email_enabled check)?
- Is the welcome email idempotent (won't send twice)?
- Check the `cv.py` upload flow where welcome email is triggered — race conditions?

**5. Frontend-Backend Contract**
- Does `apps/frontend/src/lib/api.ts` match the actual backend endpoints?
- Are TypeScript types in sync with Pydantic schemas?
- Check for any hardcoded API URLs or tier names in the frontend.

**6. AI Pipeline**
- Review `apps/backend/app/services/cv_parser.py` — is LLM output validated before storage?
- Review `apps/backend/app/services/matching.py` — is the matching algorithm correct?
- Check embedding generation in `embedding.py` — is the model consistent with the DB vector dimensions?
- Review `cv_generator.py` — are tier limits enforced correctly?

**7. Payment Flow**
- Review the DPO Pay webhook in `webhooks.py` — is it verifying payment authenticity?
- Check the payment → subscription upgrade flow — race conditions? Double-processing?
- Review the frontend payment modal in `pricing/page.tsx`.

**8. WhatsApp Bot**
- Review the webhook handler in `webhooks.py` — does it handle all message types safely?
- Check for command injection via WhatsApp messages.
- Review session state management.

**9. Docker/Infrastructure**
- Review `infra/waha/docker-compose.yml` — any security misconfigs?
- Are secrets properly managed (not hardcoded)?
- Check networking between containers.

**10. Error Handling & Resilience**
- Are all external API calls (OpenAI, OpenRouter, WAHA, Resend, Supabase) wrapped in try/catch?
- What happens when an external service is down? Does the whole system break?
- Are there proper fallbacks?

### Output Format

For each issue found, report:
```
## [SEVERITY: Critical/High/Medium/Low] — [Short Title]

**File:** path/to/file.py:line_number
**Issue:** What's wrong
**Impact:** What could go wrong
**Fix:** How to fix it
```

After the audit, provide:
1. A summary table of all issues grouped by severity
2. A prioritized fix list (what to fix first)
3. An overall health score (1-10) with justification

### Known Issues (Don't Re-report These)
- The initial migration (001) has stale CHECK constraints for tier names — this was handled by migration 006.
- RLS is bypassed by the service key — this is by design for server-side access.
- No CI/CD pipeline for backend — known, planned for later.

## PROMPT END
