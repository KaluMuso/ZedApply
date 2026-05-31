-- User-facing availability: active row and not past closing_date.
CREATE OR REPLACE VIEW public.jobs_user_facing AS
  SELECT
    j.*,
    (
      j.is_active IS TRUE
      AND (j.closing_date IS NULL OR j.closing_date >= CURRENT_DATE)
    ) AS available
  FROM public.jobs j;

COMMENT ON VIEW public.jobs_user_facing IS
  'Jobs with computed available flag for list/match feeds (active + open deadline).';
