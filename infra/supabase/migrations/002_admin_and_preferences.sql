-- 002 — Admin role + notification preferences
--
-- Idempotent: safe to re-run. The `role` column may already exist in the
-- live database (referenced by app/core/deps.py) — IF NOT EXISTS makes that a no-op.

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'user'
    CHECK (role IN ('user', 'superadmin'));

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS whatsapp_alerts BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS language VARCHAR(5) NOT NULL DEFAULT 'en'
    CHECK (language IN ('en', 'bem'));

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role) WHERE role <> 'user';

-- Admin stats RPC — rolled up in one round trip to avoid five queries from the API.
CREATE OR REPLACE FUNCTION admin_stats()
RETURNS JSONB LANGUAGE sql STABLE AS $$
    SELECT jsonb_build_object(
        'users_total', (SELECT COUNT(*) FROM users),
        'users_active_30d', (SELECT COUNT(*) FROM users WHERE updated_at > NOW() - INTERVAL '30 days'),
        'subscriptions_active', (SELECT COUNT(*) FROM subscriptions WHERE status = 'active'),
        'subscriptions_paid', (SELECT COUNT(*) FROM subscriptions WHERE status = 'active' AND tier <> 'mwana'),
        'jobs_total', (SELECT COUNT(*) FROM jobs),
        'jobs_active', (SELECT COUNT(*) FROM jobs WHERE is_active = true),
        'jobs_expired', (SELECT COUNT(*) FROM jobs WHERE is_active = true AND closing_date < CURRENT_DATE),
        'matches_24h', (SELECT COUNT(*) FROM matches WHERE created_at > NOW() - INTERVAL '24 hours'),
        'matches_total', (SELECT COUNT(*) FROM matches),
        'revenue_ngwee_30d', (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'completed' AND completed_at > NOW() - INTERVAL '30 days'),
        'revenue_ngwee_total', (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'completed')
    );
$$;
