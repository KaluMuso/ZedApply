-- 006 — email_notifications_enabled preference + tier-limit refresh
--
-- Additive only. Safe to re-run.
--
-- Tier limits change:
--   free      5  -> 10
--   starter  25  -> 50
--   professional, super_standard: unchanged

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS email_notifications_enabled BOOLEAN NOT NULL DEFAULT true;

UPDATE subscriptions
SET matches_limit = 10
WHERE tier = 'free' AND matches_limit = 5;

UPDATE subscriptions
SET matches_limit = 50
WHERE tier = 'starter' AND matches_limit = 25;
