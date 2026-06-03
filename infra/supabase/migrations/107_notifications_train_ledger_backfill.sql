-- 107: Backfill supabase_migrations.schema_migrations for notifications train.
--
-- Run on prod when schema from 099–105 exists but ledger only shows
-- 099_admin_stats_job_review_counts (20260603081919). Idempotent.
-- Do NOT delete the legacy 099_admin_stats row — 102/106 replace the function.
--
-- Verify before/after:
--   SELECT version, name FROM supabase_migrations.schema_migrations
--    WHERE name LIKE '%099%' OR name LIKE '%10%'
--    ORDER BY version;

BEGIN;

INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES
    ('20260603990001', '099_match_dismiss_note'),
    ('20260604000001', '100_in_app_notifications'),
    ('20260604010001', '101_admin_broadcast_notifications'),
    ('20260604020001', '102_admin_stats_jobs_active_public'),
    ('20260604030001', '103_zambia_skill_aliases_fix'),
    ('20260604040001', '104_user_notifications_retention'),
    ('20260604050001', '105_referral_paid_status'),
    ('20260604060001', '106_notifications_train_schema_guard')
ON CONFLICT (version) DO NOTHING;

COMMIT;
