-- 031 — Row Level Security for public.saved_jobs (requires 030_create_saved_jobs).
-- Policies: SELECT / INSERT / DELETE own rows only. No UPDATE policy (updates
-- denied for JWT-backed roles).

ALTER TABLE public.saved_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS saved_jobs_self ON public.saved_jobs;

CREATE POLICY saved_jobs_select_own ON public.saved_jobs
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY saved_jobs_insert_own ON public.saved_jobs
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY saved_jobs_delete_own ON public.saved_jobs
  FOR DELETE
  USING (user_id = auth.uid());
