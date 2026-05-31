# AI_CONTEXT.md — Zed CV Platform
# READ THIS FILE BEFORE MAKING ANY CHANGES TO THIS CODEBASE

## Project Overview
Zed CV is an AI-powered job matching SaaS for Zambia. It scrapes/ingests job listings, stores them in a vector database, matches them against user CVs using hybrid scoring, generates tailored CVs/cover letters, and delivers results via WhatsApp and a web dashboard.

## Architecture Constraints (NON-NEGOTIABLE)
- **Budget**: $100 total, ~$20-30/month operating cost
- **Developer**: Solo, AI-assisted (Claude Code, Gemini CLI, Cursor)
- **No fabrication**: Never invent APIs, endpoints, or libraries that don't exist
- **Contract-first**: All API endpoints defined in `docs/openapi.yaml` BEFORE implementation

## Cursor AI Rules of Engagement

1. **Contract-First:** NEVER invent or modify API endpoints without updating shared types/schemas first.
2. **Scope Limitation:** Only edit the files explicitly requested. Do not attempt global refactors.
3. **No Auth Hacking:** Do not modify Supabase authentication logic without explicit human approval.
4. **Diff Mode:** When proposing changes, output ONLY the code blocks that need changing, not the entire file (unless it's a new file).
5. **Validation:** After writing code, always specify the terminal commands needed to lint and test the changes.

## Tech Stack (DO NOT CHANGE WITHOUT UPDATING THIS FILE)
| Layer | Technology | Hosting | Tier |
|-------|-----------|---------|------|
| Database | Supabase (PostgreSQL + pgvector) | Supabase Cloud | Free |
| Backend | FastAPI (Python 3.11+) | Oracle Cloud Always Free | Free |
| Frontend | Next.js 14 (App Router, TypeScript) | Vercel | Free |
| Automation | n8n | Oracle Cloud Always Free | Free |
| WhatsApp | WAHA (self-hosted Docker) | Oracle Cloud Always Free | Free |
| Embeddings | Google `gemini-embedding-001` (768 dim, cosine) | Gemini API | Free tier + cache |
| LLM (parsing) | Gemini Flash via OpenRouter (+ Claude where cached) | API | ~$5-15/mo |
| Payments | DPO Pay | DPO Pay API | Per-txn |
| Currency | ZMW (Zambian Kwacha) | — | — |

## Database (Supabase)
- Project ID: chnesgmcuxyhwhzomdov
- Region: eu-west-2
- Uses `pgvector` extension for embedding storage (**768 dimensions**, `vector(768)` since migration 007)
- Embedding model invariant: **`gemini-embedding-001`** — changing without re-embedding jobs and CVs yields zero matches
- Heartbeat cron via n8n every 6 hours to prevent free tier pausing
- All migrations in `infra/supabase/migrations/`
- RPC functions for matching queries (avoid N+1 from application layer)

## Matching Algorithm

Implemented in Postgres RPC `match_jobs_for_user` (migration **060**). Weights are **additive components** (max 100), not a single cosine blend:

| Component | Weight | Notes |
|-----------|--------|--------|
| Semantic | **50%** | `(1 - cosine_distance) * 50` between CV and job embeddings |
| Skills | **20%** | Required-skill overlap |
| Experience | **15%** | `compute_experience_score` vs job min/max years |
| Location | **10%** | Exact location or remote/hybrid |
| Recency | **5%** | Linear decay over ~30 days |

- **Hard floor:** RPC returns nothing below **35**; HTTP `/matches` typically filters at **50** (`p_min_score`).
- **Explanations:** Human-readable breakdown from `app/services/match_explanation.py` (stored on match rows). Do not change RPC column names without updating OpenAPI and frontend Zod schemas.
- **Re-embed:** If `EMBEDDING_MODEL` changes, run `POST /api/v1/admin/re-embed?target=all` on both jobs and CVs.

## Job Quality Score (0-100)
- Company name present: +15
- Apply email/link present: +20
- Description > 200 chars: +10
- Salary range included: +10
- Verified source: +25
- Closing date present: +10
- Location specified: +10

## Skills Normalization
All skills are lowercased and mapped through aliases before comparison:
- "js" → "javascript", "ts" → "typescript"
- "ms word" → "microsoft office", "ppt" → "powerpoint"
- Aliases stored in `packages/utils/src/skills-aliases.ts` and `skill_aliases` DB table

## Pricing Tiers (ZMW)
| Tier | Price | Matches/Month | Features |
|------|-------|---------------|----------|
| Free | K0 | 10 | WhatsApp alerts, basic CV analysis, job browsing |
| Starter | K125/mo | 50 | Tailored CVs, priority matching, score breakdowns |
| Professional | K250/mo | 125 | Cover letters, CV rewriting, priority support |
| Super Standard | K500/mo | Unlimited | Interview prep notes + everything in Professional |

## API Conventions
- All endpoints prefixed with `/api/v1/`
- Auth via Supabase JWT (passed as Bearer token)
- Request/response validated by Pydantic (backend) and Zod (frontend)
- Error responses follow RFC 7807 Problem Details format
- All monetary values in ZMW as integers (ngwee, like cents)

## Cost Optimization
- **Prompt caching**: All Claude API calls use cached system prompts (60-80% cost reduction)
- **Embedding cache**: ai_cache table deduplicates embedding requests
- **LLM explanations**: Only generated for matches > 70 score (not all matches)
- **Batch processing**: n8n handles bulk operations off-peak

## File Structure
```
zed-cv/
├── CLAUDE.md              ← Auto-loaded by Claude Code
├── AI_CONTEXT.md          ← Full context for all AI tools
├── apps/
│   ├── backend/           ← FastAPI application
│   │   ├── app/
│   │   │   ├── api/v1/    ← Route handlers
│   │   │   ├── core/      ← Config, security, dependencies
│   │   │   ├── schemas/   ← Pydantic schemas
│   │   │   └── services/  ← Business logic
│   │   ├── requirements.txt
│   │   └── main.py
│   └── frontend/          ← Next.js 14 application
│       ├── src/app/       ← App Router pages
│       ├── src/components/
│       ├── src/lib/       ← API client, utils
│       └── package.json
├── packages/
│   ├── types/             ← Shared TypeScript types
│   └── utils/             ← Shared utilities
├── infra/
│   ├── supabase/migrations/
│   ├── n8n/
│   └── waha/
└── docs/
    └── openapi.yaml       ← API contract (source of truth)
```

## Development Rules for AI Assistants
1. **Read this file first** before any code generation task
2. **Never modify the OpenAPI spec** without updating both backend schemas AND frontend types
3. **Never add a new dependency** without checking it exists and has >1000 weekly downloads
4. **Never store secrets in code** — use environment variables via `.env` (not committed)
5. **Never use `any` type** in TypeScript — use `unknown` and narrow
6. **All database changes** must be new migration files, never edit existing ones
7. **Test edge cases**: empty CV, job with no skills, expired jobs, network failures
8. **Zambia-specific**: Phone numbers start with +260, currency is ZMW, mobile money is primary payment
9. **Keep files under 300 lines** — split into modules if growing beyond that
10. **Commit messages**: `type(scope): description` — e.g., `feat(matching): add skill normalization`

## Environment Variables Required
```
SUPABASE_URL=https://chnesgmcuxyhwhzomdov.supabase.co
SUPABASE_KEY=              # service_role (backend)
GEMINI_API_KEY=
OPENROUTER_API_KEY=
EMBEDDING_MODEL=gemini-embedding-001
ANTHROPIC_API_KEY=         # optional; prompt caching when used
DPO_PAY_COMPANY_TOKEN=
DPO_PAY_SERVICE_TYPE=
WAHA_API_URL=http://localhost:3000
WAHA_API_KEY=
JWT_SECRET=
```

## Critical Warnings
- Supabase free tier pauses after 7 days inactivity — n8n heartbeat is MANDATORY
- Oracle Cloud free tier: ARM Ampere A1 (4 OCPU, 24GB RAM shared across all VMs)
- No Zambian job site has public APIs — ingestion starts manual, then semi-automated
- WAHA requires persistent Docker container — monitor for disconnections
- DPO Pay webhooks must be verified with signature check
- User CVs contain PII — encrypt at rest, never log full content
