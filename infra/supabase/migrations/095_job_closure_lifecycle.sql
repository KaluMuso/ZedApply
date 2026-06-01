-- Job closure lifecycle: grey recently-closed listings for 3 days, then hide from default feeds.

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS hidden_after timestamptz GENERATED ALWAYS AS (
    COALESCE(
      closing_date::timestamptz,
      CASE WHEN is_active IS FALSE THEN updated_at END,
      created_at
    ) + INTERVAL '3 days'
  ) STORED;

CREATE OR REPLACE VIEW public.jobs_user_facing AS
  SELECT
    j.*,
    CASE
      WHEN j.is_active IS TRUE
        AND (j.closing_date IS NULL OR j.closing_date >= CURRENT_DATE)
        THEN 'open'
      WHEN j.closing_date IS NOT NULL
        AND j.closing_date < CURRENT_DATE
        AND j.closing_date >= CURRENT_DATE - INTERVAL '3 days'
        THEN 'recently_closed'
      ELSE 'archived'
    END AS visibility_status
  FROM public.jobs j;

COMMENT ON VIEW public.jobs_user_facing IS
  'Jobs with visibility_status for list/match feeds (open / recently_closed / archived).';

COMMENT ON COLUMN public.jobs.hidden_after IS
  'When the job drops from default user feeds (3 days after close or deactivation).';
