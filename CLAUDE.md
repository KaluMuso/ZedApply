# Zed CV — AI Job Matching Platform for Zambia

## Quick Reference
- **Stack**: FastAPI (Python) + Next.js 14 + Supabase (pgvector) + WAHA + n8n
- **Budget**: $30/mo max. Free tiers everywhere possible.
- **Currency**: ZMW (Zambian Kwacha). All amounts stored as ngwee (like cents).
- **Phones**: Always +260XXXXXXXXX format.
- **Matching**: 50% semantic + 20% skills + 15% experience + 10% location + 5% recency (migration 060).

## Before You Code
1. Read `AI_CONTEXT.md` for full architecture details
2. Check `docs/openapi.yaml` for API contracts — never add endpoints without updating it
3. Run migrations via `infra/supabase/migrations/` — never edit existing migration files
4. Keep files under 300 lines. Split into modules.

## Key Commands
```bash
# Backend
cd apps/backend && uvicorn main:app --reload --port 8000

# Frontend
cd apps/frontend && npm run dev

# Docker (WAHA + n8n)
cd infra/waha && docker-compose up -d
```

## Architecture Rules
- Contract-first: OpenAPI spec → Pydantic schemas (backend) → Zod schemas (frontend)
- No `any` in TypeScript. No secrets in code. PII encrypted at rest.
- AI calls go through cache layer (ai_cache table) to avoid duplicate API spend.
- Prompt caching enabled for Claude API calls (system prompts are cached).
- Supabase heartbeat via n8n every 6 hours — mandatory to prevent free tier pausing.

## Project Structure
```
apps/backend/    → FastAPI (Python 3.11+)
apps/frontend/   → Next.js 14 (App Router, TypeScript)
packages/types/  → Shared TypeScript types
packages/utils/  → Skills aliases, scoring helpers
infra/supabase/  → SQL migrations
infra/n8n/       → Workflow JSON exports
infra/waha/      → Docker config for WhatsApp
docs/            → OpenAPI spec
```
