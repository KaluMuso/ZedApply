-- 016_jobs_richer_schema.sql
--
-- Purpose:
--   Task #60 parallels task #59 (CV sections) for the job-ad side. A
--   good Zambian job listing carries far more than title + company +
--   description: employment type, work arrangement, benefits, tools,
--   reporting structure, interview process, success metrics, etc.
--   These columns let /jobs and /jobs/[id] render structured fields
--   AND let the list view filter on indexable dimensions like
--   employment_type and work_arrangement.
--
-- Idempotent:
--   All ADD COLUMN statements use IF NOT EXISTS so re-running the
--   migration on a partially-applied database is safe. COMMENT ON
--   COLUMN is overwrite-safe by definition.
--
-- No CHECK constraints by design:
--   Per task #28 (migration 013), validation is consolidated at the
--   Pydantic / app layer. Adding CHECK (employment_type IN (...)) here
--   would force a new migration every time we add an enum value, which
--   is exactly the friction #28 removed. The EmploymentType and
--   WorkArrangement enums live in apps/backend/app/schemas/jobs.py.
--
-- Backwards compatibility:
--   Every new column is nullable. Pre-#60 rows simply carry NULLs in
--   the new columns; the Pydantic Job response model defaults them to
--   None / [], so the existing /jobs and /jobs/[id] responses keep
--   working without backfill. Salary integer columns (salary_min,
--   salary_max) are unchanged — the salary_text parsing happens at
--   ingest, NOT at storage.
--
-- Apply ordering: 016 after 015.

BEGIN;

-- Employment shape ─────────────────────────────────────────────────
ALTER TABLE public.jobs
    ADD COLUMN IF NOT EXISTS employment_type     TEXT,
    ADD COLUMN IF NOT EXISTS work_arrangement    TEXT,
    ADD COLUMN IF NOT EXISTS hybrid_days_per_week INTEGER;

COMMENT ON COLUMN public.jobs.employment_type IS
    'Validated against app/schemas/jobs.py::EmploymentType '
    '(full_time | part_time | contract | freelance | internship | temporary). '
    'No DB CHECK by design — see migration 013.';
COMMENT ON COLUMN public.jobs.work_arrangement IS
    'Validated against app/schemas/jobs.py::WorkArrangement '
    '(remote | hybrid | on_site). No DB CHECK by design.';
COMMENT ON COLUMN public.jobs.hybrid_days_per_week IS
    '1-5; only meaningful when work_arrangement = hybrid. Pydantic '
    'enforces the range, not the cross-field constraint.';

-- Benefits + tools ─────────────────────────────────────────────────
-- Stored as JSONB rather than text[] so the existing supabase-py
-- patterns (.execute returns Python list) don't need an array adapter,
-- and so a future migration can extend each item from string → object
-- without an ALTER TYPE.
ALTER TABLE public.jobs
    ADD COLUMN IF NOT EXISTS benefits          JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS tools_tech_stack  JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.jobs.benefits IS
    'JSONB array of strings, max 20 items / max 200 chars each. '
    'Caps enforced at the Pydantic layer (JobCreate validators).';
COMMENT ON COLUMN public.jobs.tools_tech_stack IS
    'JSONB array of strings, max 30 items / max 80 chars each. '
    'Lowercased + dedup''d before insert (JobCreate validator).';

-- Long-form structured fields ──────────────────────────────────────
ALTER TABLE public.jobs
    ADD COLUMN IF NOT EXISTS application_instructions TEXT,
    ADD COLUMN IF NOT EXISTS reporting_structure     TEXT,
    ADD COLUMN IF NOT EXISTS manages_others          INTEGER,
    ADD COLUMN IF NOT EXISTS interview_process       TEXT,
    ADD COLUMN IF NOT EXISTS success_metrics         TEXT,
    ADD COLUMN IF NOT EXISTS company_description     TEXT,
    ADD COLUMN IF NOT EXISTS reference_number        TEXT;

COMMENT ON COLUMN public.jobs.application_instructions IS
    'Free-text application instructions (max 2000 chars at Pydantic '
    'layer). Renders as a distinct block on /jobs/[id].';
COMMENT ON COLUMN public.jobs.reporting_structure IS
    'Who the role reports to (max 500 chars). Surfaced in the '
    '"More about this role" collapsed section.';
COMMENT ON COLUMN public.jobs.manages_others IS
    'Count of direct reports if a management role; null otherwise. '
    'ge=0, le=10000 at the Pydantic layer.';
COMMENT ON COLUMN public.jobs.interview_process IS
    'Free-text description of the hiring process steps (max 1000 chars).';
COMMENT ON COLUMN public.jobs.success_metrics IS
    'How the role''s success is measured (max 1000 chars).';
COMMENT ON COLUMN public.jobs.company_description IS
    'Background on the hiring company (max 2000 chars). Distinct from '
    'public.jobs.description which is the role itself.';
COMMENT ON COLUMN public.jobs.reference_number IS
    'Employer-supplied requisition / reference number (max 100 chars).';

-- Compensation enrichment ──────────────────────────────────────────
-- salary_min and salary_max columns already exist (ngwee). New columns
-- describe the unit / cadence / additional comp components.
ALTER TABLE public.jobs
    ADD COLUMN IF NOT EXISTS currency        TEXT,
    ADD COLUMN IF NOT EXISTS pay_frequency   TEXT,
    ADD COLUMN IF NOT EXISTS bonus_structure TEXT,
    ADD COLUMN IF NOT EXISTS equity_offered  BOOLEAN;

COMMENT ON COLUMN public.jobs.currency IS
    '3-letter ISO 4217 currency code (ZMW, USD, etc). Uppercased at '
    'the Pydantic layer. salary_min/max remain in the smallest unit '
    'of this currency — ngwee for ZMW per AGENTS.md invariant.';
COMMENT ON COLUMN public.jobs.pay_frequency IS
    'monthly | annual | hourly | daily. Validated at the Pydantic '
    'layer (jobs.py::PayFrequency Literal).';
COMMENT ON COLUMN public.jobs.bonus_structure IS
    'Free-text description of bonus / variable comp (max 500 chars).';
COMMENT ON COLUMN public.jobs.equity_offered IS
    'Boolean — true when the listing mentions equity / stock options.';

COMMIT;
