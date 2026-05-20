-- 030 — RLS for saved_jobs (table created in 003 without policies)

ALTER TABLE saved_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS saved_jobs_self ON saved_jobs;
CREATE POLICY saved_jobs_self ON saved_jobs
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE saved_jobs IS
  'User bookmarked jobs. Backs POST/DELETE /jobs/{id}/save and GET /users/me/saved-jobs.';
