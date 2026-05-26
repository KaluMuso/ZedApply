-- 068: Multi-source provenance, admin force-publish, public job visibility

BEGIN;

ALTER TABLE public.jobs
    ADD COLUMN IF NOT EXISTS scraping_sources jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.jobs.scraping_sources IS
    'Array of {url, source_type, scraped_at} — multiple aggregators per job';

ALTER TABLE public.jobs
    ADD COLUMN IF NOT EXISTS admin_published boolean DEFAULT NULL;

COMMENT ON COLUMN public.jobs.admin_published IS
    'When true, job is publicly listable even without extracted apply contacts';

-- Backfill provenance from legacy source_url
UPDATE public.jobs
SET scraping_sources = jsonb_build_array(
    jsonb_build_object(
        'url', source_url,
        'source_type', CASE
            WHEN source_url ILIKE '%jobwebzambia%' THEN 'jobwebzambia'
            WHEN source_url ILIKE '%gozambiajobs%' THEN 'gozambiajobs'
            WHEN source_url ILIKE '%jobsearchzambia%' THEN 'jobsearchzambia'
            WHEN source_url ILIKE '%whatsapp%' THEN 'whatsapp'
            ELSE 'other'
        END,
        'scraped_at', COALESCE(created_at, NOW())
    )
)
WHERE source_url IS NOT NULL
  AND (
      scraping_sources IS NULL
      OR scraping_sources = '[]'::jsonb
  );

-- Hide jobs with no apply channel from the public site (admin can override)
UPDATE public.jobs
SET is_active = false
WHERE is_active = true
  AND apply_url IS NULL
  AND apply_email IS NULL
  AND contact_phone IS NULL
  AND COALESCE(admin_published, false) = false;

CREATE OR REPLACE VIEW public.public_jobs AS
SELECT *
FROM public.jobs
WHERE is_active = true
  AND COALESCE(is_review_required, false) = false
  AND (
      apply_url IS NOT NULL
      OR apply_email IS NOT NULL
      OR contact_phone IS NOT NULL
      OR admin_published = true
  );

COMMENT ON VIEW public.public_jobs IS
    'Jobs visible on the public /jobs feed and detail pages';

COMMIT;
