# Cursor Handoff Guide — Zed CV
# Use this when Cowork hits its 5-hour cooldown and you switch to Cursor Pro

## STEP 1: Get the Code onto GitHub (one-time setup)

```bash
# In your terminal (not Cursor), navigate to where Cowork saved the project
cd "path/to/Zed CV/zed-cv"

# Initialize git repo
git init
git add -A
git commit -m "feat: initial project scaffold from Cowork

Includes FastAPI backend, Next.js frontend, Supabase schema,
n8n workflows, WAHA config, shared types, and AI_CONTEXT.md"

# Create a private GitHub repo (requires gh CLI installed)
gh repo create zed-cv --private --source=. --push

# OR manually: create repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/zed-cv.git
git branch -M main
git push -u origin main
```

## STEP 2: Open in Cursor

```bash
# Clone if you haven't already
git clone https://github.com/YOUR_USERNAME/zed-cv.git
cd zed-cv

# Open in Cursor
cursor .
```

## STEP 3: First Thing Cursor Must Read

When you open a new Cursor chat, ALWAYS start with:

```
@CLAUDE.md @AI_CONTEXT.md

Read both of these files. They contain the full project context,
architecture constraints, and development rules.
I'm continuing work from a Cowork session.
```

## STEP 4: Cursor-Specific Settings

### .cursorrules (create this file in the repo root)
```
You are working on Zed CV, an AI job matching platform for Zambia.

BEFORE writing any code:
1. Read CLAUDE.md and AI_CONTEXT.md
2. Check docs/openapi.yaml for API contracts
3. Never add endpoints without updating the OpenAPI spec

Stack: FastAPI + Next.js 14 + Supabase (pgvector) + WAHA + n8n
Budget: $30/month max. Free tiers everywhere.
Currency: ZMW. Phones: +260XXXXXXXXX format.

Rules:
- No `any` in TypeScript
- Keep files under 300 lines
- Pydantic validation on backend, Zod on frontend
- All monetary values in ngwee (like cents)
- Prompt caching enabled for Claude API calls
- Never edit existing migration files, create new ones
```

### Cursor Pro Tips for This Project
1. **Use @codebase sparingly** — only when you need cross-file context
2. **Scope file references** — use @filename instead of @codebase
3. **Disable auto-run** — Settings > Features > uncheck "Auto-run terminal commands"
4. **Use Cursor Tab** for completions, Chat for generation
5. **Composer** for multi-file edits (safer than inline for refactors)

---

## TASK QUEUE: What to Work on in Cursor

Copy-paste the relevant task prompt below into Cursor when you're ready to work on it.

### Task A: Profile Page (Frontend)
```
@AI_CONTEXT.md @apps/frontend/src/lib/api.ts

Create a profile page at apps/frontend/src/app/profile/page.tsx that:
1. Shows the user's profile info (name, phone, location, skills, subscription tier)
2. Has a CV upload section with drag-and-drop (calls the /cv/upload endpoint)
3. Shows parsed skills as colored tags after upload
4. Has an "Edit Profile" form that calls PATCH /profile
5. Shows subscription status with link to /pricing

Use the api.ts client for all API calls. Store the JWT token in localStorage.
Follow the existing page patterns from matches/page.tsx.
```

### Task B: Jobs Browse Page (Frontend)
```
@AI_CONTEXT.md @apps/frontend/src/app/matches/page.tsx

Create a jobs browsing page at apps/frontend/src/app/jobs/page.tsx that:
1. Lists all active jobs with pagination (20 per page)
2. Has search bar (filters by title, company, description)
3. Has location dropdown filter (Lusaka, Kitwe, Ndola, Livingstone, Kabwe, etc.)
4. Each job card shows: title, company, location, quality score badge, closing date
5. Clicking a job expands to show full description and apply link/email

Use the jobs.list() and jobs.get() API functions from api.ts.
Follow the card UI pattern from the matches page.
```

### Task C: Cover Letter Generation Endpoint (Backend)
```
@AI_CONTEXT.md @apps/backend/app/services/cv_parser.py

Create the cover letter generation endpoint:
1. Add apps/backend/app/services/cover_letter.py:
   - Function generate_cover_letter(user_cv_text, job_description, tone)
   - Use Claude Haiku with prompt caching (same pattern as cv_parser.py)
   - System prompt should be cached with cache_control: {"type": "ephemeral"}
   - Tone options: formal, friendly, confident
   - Return the letter text + word count

2. Add apps/backend/app/api/v1/cover_letter.py:
   - POST /cover-letter/generate
   - Requires Bwino tier (check subscription)
   - Takes job_id and optional tone
   - Fetches user's CV text and job description from DB
   - Calls the service function
   - Stores result in generated_documents table

3. Register the router in main.py

Follow the OpenAPI spec in docs/openapi.yaml for the request/response shapes.
```

### Task D: DPO Pay Integration (Backend)
```
@AI_CONTEXT.md @apps/backend/app/api/v1/webhooks.py

Implement the DPO Pay payment flow:
1. Add apps/backend/app/services/dpo_pay.py:
   - create_payment_token(amount_zmw, phone, description) → token
   - verify_payment(transaction_token) → status
   - DPO API docs: POST to https://secure.3gdirectpay.com/API/v6/
   - Uses XML request/response format
   - Company token from settings.dpo_pay_company_token

2. Update apps/backend/app/api/v1/webhooks.py:
   - Parse the DPO XML webhook payload
   - Verify with DPO API
   - If success: update payment status, upgrade subscription tier
   - Send WhatsApp confirmation to user

3. Add POST /subscription/pay endpoint in a new file if not exists:
   - Creates payment record in DB
   - Calls DPO to get payment token
   - Returns redirect URL for user

Amounts: Mwezi = K79 (7900 ngwee), Bwino = K199 (19900 ngwee). Currency: ZMW.
```

### Task E: Job Scraper Workflow (n8n)
```
@AI_CONTEXT.md @infra/n8n/heartbeat_workflow.json

Design (don't code yet, just plan) a job scraping workflow for n8n:
1. Target sites: BestZambiaJobs.com, GoZambiaJobs.com, Zambia job Facebook groups
2. No public APIs exist — we need HTTP Request node to fetch HTML
3. Parse with Code node (JavaScript) to extract job fields
4. POST each job to our FastAPI /jobs endpoint
5. Run daily at 6AM (before the 7AM digest)

Create the plan as a markdown file at docs/JOB_SCRAPER_PLAN.md.
Include: which sites, what selectors to look for, rate limiting strategy,
error handling, and how to handle sites that block scraping.
```

---

## WORKFLOW: Cowork ↔ Cursor Rotation

```
┌─────────────────────────────────────────────┐
│  COWORK SESSION (active)                     │
│  → Architecture decisions, DB migrations,    │
│    complex multi-file features, planning     │
│  → When limit hits → git commit & push       │
└──────────────┬──────────────────────────────┘
               │ git push
               ▼
┌─────────────────────────────────────────────┐
│  CURSOR PRO (during 5-hour cooldown)         │
│  → Pick a task from the queue above          │
│  → Start chat with @CLAUDE.md @AI_CONTEXT.md │
│  → Use Composer for multi-file edits         │
│  → git commit & push when done               │
└──────────────┬──────────────────────────────┘
               │ git push
               ▼
┌─────────────────────────────────────────────┐
│  COWORK SESSION (next)                       │
│  → git pull to sync Cursor changes           │
│  → Review what Cursor did                    │
│  → Continue with next priority               │
└─────────────────────────────────────────────┘
```

### Key Rules for the Rotation:
1. **Always commit and push** before switching tools
2. **Always pull** when starting a new session in either tool
3. **One branch** — keep it simple, work on `main` for now
4. **Cursor does implementation** — give it scoped, specific tasks
5. **Cowork does architecture** — migrations, cross-cutting concerns, reviews
6. **Never let Cursor run migrations** — only Cowork has the Supabase MCP

### Saving Cursor Pro Requests:
- Use **Cursor Tab** (completions) for small edits — it's free/cheap
- Use **Chat** only for generation tasks — paste the task prompts above
- Use **Composer** for multi-file refactors — more efficient than individual chats
- **Don't use @codebase** unless truly needed — it burns tokens fast
- For simple questions, check AI_CONTEXT.md yourself first

---

## ENVIRONMENT SETUP (for Cursor terminal)

```bash
# Backend
cd apps/backend
python -m venv .venv
source .venv/bin/activate  # or .venv\Scripts\activate on Windows
pip install -r requirements.txt
cp .env.example .env
# Fill in your keys in .env
uvicorn main:app --reload --port 8000

# Frontend (in a separate terminal)
cd apps/frontend
npm install
echo "NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1" > .env.local
npm run dev
```

## SUPABASE PROJECT INFO
- Project ID: chnesgmcuxyhwhzomdov
- Region: eu-west-2
- Dashboard: https://supabase.com/dashboard/project/chnesgmcuxyhwhzomdov
- DB tables: 16 tables, 40 skills, 15 aliases — all migrated and ready
- Get your keys from: Dashboard > Settings > API
