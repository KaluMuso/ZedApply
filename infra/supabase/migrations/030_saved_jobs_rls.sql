-- 030 — RLS for saved_jobs (table created in 003 without policies).
-- Backend uses the service role and bypasses RLS; these policies protect
-- direct PostgREST access with the user's JWT (auth.uid() = public.users.id).

ALTER TABLE public.saved_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY saved_jobs_self ON public.saved_jobs
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
