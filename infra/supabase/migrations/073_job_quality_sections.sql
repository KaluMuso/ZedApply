-- Job ingest quality pipeline: deactivation reasons, multi-role grouping, structured sections.
-- Applied after ingest/backfill; existing active rows are unchanged until backfill runs.

ALTER TABLE public.jobs
    ADD COLUMN IF NOT EXISTS deactivation_reason text NULL,
    ADD COLUMN IF NOT EXISTS parent_listing_signature text NULL,
    ADD COLUMN IF NOT EXISTS section_responsibilities text NULL,
    ADD COLUMN IF NOT EXISTS section_requirements text NULL,
    ADD COLUMN IF NOT EXISTS section_benefits text NULL,
    ADD COLUMN IF NOT EXISTS section_how_to_apply text NULL,
    ADD COLUMN IF NOT EXISTS section_about text NULL;

COMMENT ON COLUMN public.jobs.deactivation_reason IS
    'Why ingest quality gates set is_active=false (e.g. missing_source_url).';
COMMENT ON COLUMN public.jobs.parent_listing_signature IS
    'Hash grouping jobs split from the same multi-role listing.';

CREATE INDEX IF NOT EXISTS idx_jobs_parent_listing_signature
    ON public.jobs (parent_listing_signature)
    WHERE parent_listing_signature IS NOT NULL;
