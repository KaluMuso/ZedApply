-- 030 — Create saved_jobs for databases that never had the table (e.g. live
-- skipped 003). Apply in SQL Editor before 031_saved_jobs_rls.sql; confirm
-- public.saved_jobs exists before running RLS.

CREATE TABLE IF NOT EXISTS public.saved_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.jobs (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, job_id)
);

CREATE INDEX IF NOT EXISTS saved_jobs_user_id_idx ON public.saved_jobs (user_id);
CREATE INDEX IF NOT EXISTS saved_jobs_job_id_idx ON public.saved_jobs (job_id);
