-- After file rename (064 collision cleanup, 2026-05-25), register the new
-- migration names in supabase_migrations.schema_migrations so CLI/history
-- matches on-disk filenames. SQL was already applied under the old 064_* names.
--
-- Run once in Supabase SQL Editor (service_role) after merging the PR.
-- Kaluba verification:
--   SELECT name FROM supabase_migrations.schema_migrations
--    WHERE name LIKE '06%' ORDER BY name;

INSERT INTO supabase_migrations.schema_migrations (version, name, statements)
SELECT * FROM (VALUES
  ('20260524000001', '066_hnsw_and_pruning', ARRAY['-- already applied as 064_hnsw_and_pruning']::text[]),
  ('20260524000002', '067_job_expiration_cron', ARRAY['-- already applied as 064_job_expiration_cron']::text[])
) AS t(version, name, statements)
WHERE NOT EXISTS (
  SELECT 1 FROM supabase_migrations.schema_migrations sm WHERE sm.name = t.name
);

-- Optional: remove stale registry rows for the old filenames (only if present).
-- Uncomment after confirming the INSERT above succeeded.
-- DELETE FROM supabase_migrations.schema_migrations
--  WHERE name IN ('064_hnsw_and_pruning', '064_job_expiration_cron');
