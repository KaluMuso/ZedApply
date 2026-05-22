# ZedApply Architecture

## Core Stack
- **Frontend:** Next.js (App Router), TailwindCSS, Zustand, shadcn/ui.
- **Backend:** FastAPI (Python 3.11), Supabase (Postgres + pgvector), Redis queues.
- **Hosting/Infra:** Oracle Cloud Always Free (Backend + WHA Docker), Vercel/Brazil free tier (Frontend), Docker/docker-compose.
- **Automation/Data:** n8n workflows (scraping, db keep-alive cron every 6 hours).
- **Payments:** Lenco (MTN/Airtel Mobile Money API via USSD).

## Zambian Business Logic & Rules
- **WhatsApp-First:** Core user experience is via WhatsApp (WHA container). Web dashboard is secondary.
- **Job Scoring (Anti-Scam):** All scraped jobs undergo 100-point trust scoring. <40 points = Quarantine (manual review). <20 points = Auto-delete. (Corporate email +20, Registered company +15, Salary +10, >200 words +10).
- **Tiers:** Mwana (Free/5 matches), Mwizi (79 ZMW/mo), Wino (199 ZMW/mo).