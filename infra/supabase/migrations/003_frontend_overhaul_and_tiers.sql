-- 003 — Tier rename + performance/indexes + profile/application tables
-- Additive migration only; does not edit earlier migration files.

-- 1) Indexes
CREATE INDEX IF NOT EXISTS idx_jobs_is_active ON jobs(is_active);
CREATE INDEX IF NOT EXISTS idx_jobs_location_plain ON jobs(location);
CREATE INDEX IF NOT EXISTS idx_jobs_source ON jobs(source);
CREATE INDEX IF NOT EXISTS idx_jobs_posted_at ON jobs(posted_at DESC);
CREATE INDEX IF NOT EXISTS idx_matches_user_id ON matches(user_id);
CREATE INDEX IF NOT EXISTS idx_matches_score ON matches(score DESC);
CREATE INDEX IF NOT EXISTS idx_users_role_all ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_phone_plain ON users(phone);

-- 2) Job metadata columns
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS job_type VARCHAR DEFAULT 'full-time';
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS category VARCHAR;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS experience_level VARCHAR;

-- 3) Extra profile columns for CV builder
ALTER TABLE users ADD COLUMN IF NOT EXISTS headline VARCHAR;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS education JSONB DEFAULT '[]'::jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS work_experience JSONB DEFAULT '[]'::jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS certifications JSONB DEFAULT '[]'::jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS languages JSONB DEFAULT '[]'::jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_photo_url TEXT;

-- 4) Application tracking
CREATE TABLE IF NOT EXISTS applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  match_id UUID REFERENCES matches(id) ON DELETE SET NULL,
  status VARCHAR DEFAULT 'applied',
  applied_at TIMESTAMPTZ DEFAULT now(),
  notes TEXT,
  UNIQUE(user_id, job_id)
);

-- 5) Saved jobs
CREATE TABLE IF NOT EXISTS saved_jobs (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  saved_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, job_id)
);

-- 6) Tier rename and defaults (mwana/mwezi/bwino -> free/starter/professional)
ALTER TABLE users
  ALTER COLUMN subscription_tier DROP DEFAULT;
ALTER TABLE subscriptions
  ALTER COLUMN tier DROP DEFAULT;

UPDATE users
SET subscription_tier = CASE subscription_tier
  WHEN 'mwana' THEN 'free'
  WHEN 'mwezi' THEN 'starter'
  WHEN 'bwino' THEN 'professional'
  ELSE subscription_tier
END;

UPDATE subscriptions
SET tier = CASE tier
  WHEN 'mwana' THEN 'free'
  WHEN 'mwezi' THEN 'starter'
  WHEN 'bwino' THEN 'professional'
  ELSE tier
END;

ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_subscription_tier_check;
ALTER TABLE users
  ADD CONSTRAINT users_subscription_tier_check
  CHECK (subscription_tier IN ('free', 'starter', 'professional'));

ALTER TABLE subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_tier_check;
ALTER TABLE subscriptions
  ADD CONSTRAINT subscriptions_tier_check
  CHECK (tier IN ('free', 'starter', 'professional'));

ALTER TABLE users
  ALTER COLUMN subscription_tier SET DEFAULT 'free';
ALTER TABLE subscriptions
  ALTER COLUMN tier SET DEFAULT 'free';

-- 7) Align limits
UPDATE subscriptions
SET matches_limit = CASE tier
  WHEN 'free' THEN 5
  WHEN 'starter' THEN 25
  WHEN 'professional' THEN 125
  ELSE matches_limit
END;

-- 8) Update admin stats RPC to treat paid tiers as starter/professional
CREATE OR REPLACE FUNCTION admin_stats()
RETURNS JSONB LANGUAGE sql STABLE AS $$
    SELECT jsonb_build_object(
        'users_total', (SELECT COUNT(*) FROM users),
        'users_active_30d', (SELECT COUNT(*) FROM users WHERE updated_at > NOW() - INTERVAL '30 days'),
        'subscriptions_active', (SELECT COUNT(*) FROM subscriptions WHERE status = 'active'),
        'subscriptions_paid', (SELECT COUNT(*) FROM subscriptions WHERE status = 'active' AND tier <> 'free'),
        'jobs_total', (SELECT COUNT(*) FROM jobs),
        'jobs_active', (SELECT COUNT(*) FROM jobs WHERE is_active = true),
        'jobs_expired', (SELECT COUNT(*) FROM jobs WHERE is_active = true AND closing_date < CURRENT_DATE),
        'matches_24h', (SELECT COUNT(*) FROM matches WHERE created_at > NOW() - INTERVAL '24 hours'),
        'matches_total', (SELECT COUNT(*) FROM matches),
        'revenue_ngwee_30d', (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'completed' AND completed_at > NOW() - INTERVAL '30 days'),
        'revenue_ngwee_total', (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'completed')
    );
$$;
