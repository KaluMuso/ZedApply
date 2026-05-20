-- 033_subscription_billing_periods.sql
--
-- Billing-period tracking for ZedApply subscriptions:
--   - users: subscription_started_at, subscription_expires_at, subscription_renews_at
--   - subscriptions: started_at, cancelled_at, lenco_subscription_ref
--   - payments.subscription_id already exists (001); ensure FK is indexed
--   - RPC downgrade_expired_subscriptions() for daily n8n cron
--
-- Apply ordering: 033 after 032_experience_profile_enrichment.
-- Idempotent: IF NOT EXISTS columns; CREATE OR REPLACE RPC.

BEGIN;

-- ── users: denormalised billing window for fast expiry checks ─────────
ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS subscription_renews_at TIMESTAMPTZ;

COMMENT ON COLUMN public.users.subscription_started_at IS
    'When the user first activated a paid plan (unchanged on renewals).';
COMMENT ON COLUMN public.users.subscription_expires_at IS
    'End of the current paid access window (UTC).';
COMMENT ON COLUMN public.users.subscription_renews_at IS
    'Next scheduled charge date (current period end for monthly billing).';

CREATE INDEX IF NOT EXISTS idx_users_subscription_expires
    ON public.users (subscription_expires_at)
    WHERE subscription_tier <> 'free' AND subscription_expires_at IS NOT NULL;

-- ── subscriptions: period + Lenco recurring ref ─────────────────────
ALTER TABLE public.subscriptions
    ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS lenco_subscription_ref TEXT;

COMMENT ON COLUMN public.subscriptions.started_at IS
    'When this subscription row was first activated for a paid tier.';
COMMENT ON COLUMN public.subscriptions.lenco_subscription_ref IS
    'Lenco transaction/subscription reference from the last successful charge.';

CREATE INDEX IF NOT EXISTS idx_subscriptions_active_period
    ON public.subscriptions (user_id, current_period_start)
    WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_payments_subscription
    ON public.payments (subscription_id)
    WHERE subscription_id IS NOT NULL;

-- Backfill started_at from current_period_start where missing.
UPDATE public.subscriptions
SET started_at = COALESCE(started_at, current_period_start, created_at)
WHERE started_at IS NULL;

-- Backfill users billing columns from active paid subscriptions.
UPDATE public.users u
SET
    subscription_started_at = COALESCE(
        u.subscription_started_at,
        s.started_at,
        s.current_period_start
    ),
    subscription_expires_at = COALESCE(
        u.subscription_expires_at,
        s.current_period_end
    ),
    subscription_renews_at = COALESCE(
        u.subscription_renews_at,
        s.current_period_end
    )
FROM public.subscriptions s
WHERE s.user_id = u.id
  AND s.status = 'active'
  AND s.tier <> 'free'
  AND s.current_period_end IS NOT NULL;

-- ── n8n daily cron: downgrade expired paid users to free ──────────────
CREATE OR REPLACE FUNCTION public.downgrade_expired_subscriptions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    WITH expired AS (
        SELECT u.id AS user_id
        FROM public.users u
        WHERE u.subscription_expires_at IS NOT NULL
          AND u.subscription_expires_at < NOW()
          AND u.subscription_tier <> 'free'
    ),
    subs AS (
        UPDATE public.subscriptions s
        SET
            tier = 'free',
            status = 'cancelled',
            cancelled_at = NOW(),
            current_period_end = NOW(),
            matches_limit = 10,
            updated_at = NOW()
        FROM expired e
        WHERE s.user_id = e.user_id
          AND s.status = 'active'
        RETURNING s.user_id
    )
    UPDATE public.users u
    SET
        subscription_tier = 'free',
        subscription_expires_at = NULL,
        subscription_renews_at = NULL,
        updated_at = NOW()
    FROM expired e
    WHERE u.id = e.user_id;

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;

COMMENT ON FUNCTION public.downgrade_expired_subscriptions() IS
    'Downgrade users whose subscription_expires_at is in the past. Called daily by n8n.';

GRANT EXECUTE ON FUNCTION public.downgrade_expired_subscriptions() TO service_role;

COMMIT;
