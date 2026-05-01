-- 005 — Super Standard tier (K500/mo, unlimited matches) + interview prep cache type
-- Additive migration. Allowed tier values now: free, starter, professional, super_standard.

-- Expand tier CHECK constraints
ALTER TABLE users
    DROP CONSTRAINT IF EXISTS users_subscription_tier_check;
ALTER TABLE users
    ADD CONSTRAINT users_subscription_tier_check
    CHECK (subscription_tier IN ('free', 'starter', 'professional', 'super_standard'));

ALTER TABLE subscriptions
    DROP CONSTRAINT IF EXISTS subscriptions_tier_check;
ALTER TABLE subscriptions
    ADD CONSTRAINT subscriptions_tier_check
    CHECK (tier IN ('free', 'starter', 'professional', 'super_standard'));

-- Treat super_standard as effectively unlimited via a high sentinel.
-- Keeps matches_limit numeric so existing quota arithmetic doesn't need a NULL branch.
UPDATE subscriptions
SET matches_limit = 99999
WHERE tier = 'super_standard';

-- Allow ai_cache to store interview prep responses for re-open without re-billing.
ALTER TABLE ai_cache DROP CONSTRAINT IF EXISTS ai_cache_cache_type_check;
ALTER TABLE ai_cache
    ADD CONSTRAINT ai_cache_cache_type_check
    CHECK (cache_type IN (
        'embedding', 'cv_parse', 'cv_analysis', 'cover_letter', 'interview_prep', 'explanation'
    ));
