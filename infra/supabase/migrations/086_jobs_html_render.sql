-- WYSIWYG job descriptions + deep-enrich timestamps + closure metadata.
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS description_html text,
  ADD COLUMN IF NOT EXISTS section_html jsonb,
  ADD COLUMN IF NOT EXISTS deep_enriched_at timestamptz,
  ADD COLUMN IF NOT EXISTS closed_at timestamptz,
  ADD COLUMN IF NOT EXISTS closure_reason text;

COMMENT ON COLUMN public.jobs.description_html IS
  'Bleach-sanitized HTML rendered from description markdown at deep-enrich time.';
COMMENT ON COLUMN public.jobs.section_html IS
  'Per-section sanitized HTML: responsibilities, requirements, benefits, how_to_apply, about.';
COMMENT ON COLUMN public.jobs.deep_enriched_at IS
  'When the deep-enrich pipeline last processed this row from source_url.';
COMMENT ON COLUMN public.jobs.closed_at IS
  'When the listing was marked closed (deadline passed or manual).';
COMMENT ON COLUMN public.jobs.closure_reason IS
  'Human-readable reason shown on inactive job detail pages.';

ALTER TABLE public.apply_url_backfill_log
  ADD COLUMN IF NOT EXISTS outcome text,
  ADD COLUMN IF NOT EXISTS detail text;

COMMENT ON COLUMN public.apply_url_backfill_log.outcome IS
  'Pipeline outcome label (e.g. deep_enrich:enriched, deep_enrich:split).';
COMMENT ON COLUMN public.apply_url_backfill_log.detail IS
  'Optional detail / error message for audit.';
