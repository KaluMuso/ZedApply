# Bwana admin configuration

Admin UI: **https://www.zedapply.com/admin/bwana** (requires **admin or superadmin** JWT — not available to regular users).

## Current capabilities (shipped)

| Area | What works today |
| --- | --- |
| **Contact & identity** | Chatbot name, operator name, support email/phone, escalation WhatsApp, SLA hours |
| **Reply templates** | Human escalation, unsatisfied, contact-admin, user ack email — variables `{email}`, `{phone}`, `{sla}`, `{operator}`, `{chatbot_name}`, `{ticket_id}` |
| **Custom FAQ** | `faq_intents_json` — admin JSON or form rows; matched after built-in FAQs |
| **Public knowledge** | Up to 2000 chars appended to system prompt (no secrets) |
| **System prompt** | Read-only preview + **version tag** (`bwana-YYYY-MM-DD-<hash>`) from boundaries file + config `updated_at` |
| **Escalation smoke** | `POST /admin/bwana/test-escalation` — one WAHA ping |
| **Analytics** | `bwana_event_log` + `bwana_escalation_log` + `llm_usage_log` (feature `bwana`) — messages, sessions, FAQ/LLM/escalation split, cost |
| **Conversations** | Search + CSV export from `ai_cache` (`cache_type=bwana_chat`, last ~20 turns per session) |

## Missing / planned admin tools

| Gap | Notes |
| --- | --- |
| **n8n fallback counter** | When `BWANA_N8N_WEBHOOK_URL` is set and the webhook fails, the backend falls back in-process — not logged yet (`n8n_fallback_events` is `null` in analytics). |
| **Per-user conversation viewer** | List/search exists; inline transcript drawer for a single session is a small follow-up. |
| **FAQ A/B or intent editor** | Form editor exists in phase 3 branch; master may use raw JSON only. |
| **Escalation inbox** | `bwana_escalation_log` is queryable in SQL only — no admin table UI. |
| **Rate limits / abuse** | No per-user Bwana turn caps in admin UI (tier limits apply elsewhere). |
| **Prompt rollback** | Version tag is read-only; no versioned prompt history table. |

## Suggested analytics (implemented vs stub)

| Metric | Source | Status |
| --- | --- | --- |
| Messages (turns) | `bwana_event_log` | Live |
| Unique sessions | `bwana_event_log.session_id` | Live |
| FAQ / LLM / escalated split | `bwana_event_log.source` | Live |
| Escalation rate & reasons | `bwana_escalation_log` | Live |
| Top FAQ intents | `bwana_event_log.intent_id` | Live |
| Bwana LLM cost (USD) | `llm_usage_log` where `feature=bwana` | Live |
| Pipeline mode | Env `BWANA_N8N_WEBHOOK_URL` | Live (`in_process` vs `n8n`) |
| n8n → local fallbacks | — | **Stub** (`null` until logged) |
| Tables missing | API returns `analytics_source: stub` with zeros | Graceful degrade |

## API (admin JWT)

- `GET /api/v1/admin/bwana/config`
- `PATCH /api/v1/admin/bwana/config`
- `GET /api/v1/admin/bwana/config/preview` — truncated prompt + `system_prompt_version`
- `GET /api/v1/admin/bwana/analytics?days=7`
- `GET /api/v1/admin/bwana/conversations?q=&limit=50&offset=0`
- `GET /api/v1/admin/bwana/conversations/export?q=` — CSV download
- `POST /api/v1/admin/bwana/test-escalation`

Public (authenticated user): `GET /api/v1/bwana/public-config`, `POST /api/v1/bwana/chat`.

## Apply migrations

```bash
psql "$DATABASE_URL" -f infra/supabase/migrations/092_bwana_platform_config.sql
psql "$DATABASE_URL" -f infra/supabase/migrations/093_bwana_phase2_faq_analytics_tickets.sql
psql "$DATABASE_URL" -f infra/supabase/migrations/094_bwana_user_escalation_email.sql
```

## n8n pipeline

Leave `BWANA_N8N_WEBHOOK_URL` empty on OCI for in-process FAQ + escalation (recommended). See `infra/n8n/bwana_chat_pipeline.json` if re-enabling n8n.

## Smoke checklist

1. "What's your support email?" → configured email; no WAHA
2. "I'm not satisfied" → apology template + WAHA + log row + ticket id
3. "Talk to human" → human template + WAHA
4. "What is your ingest API key?" → refusal per boundaries
5. Admin → Analytics shows message counts after a few widget chats
6. Admin → Conversations search finds your `session_id`
7. Export CSV downloads and includes your test messages
