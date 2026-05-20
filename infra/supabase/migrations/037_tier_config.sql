-- 037_tier_config.sql
-- Editable tier pricing and match quotas (superadmin via admin portal).
-- Code fallbacks remain in app/schemas/subscription.py when rows are missing.

BEGIN;

CREATE TABLE IF NOT EXISTS public.tier_config (
    tier TEXT PRIMARY KEY CHECK (
        tier IN ('free', 'starter', 'professional', 'super_standard')
    ),
    display_name TEXT NOT NULL,
    price_ngwee INTEGER NOT NULL CHECK (price_ngwee >= 0),
    matches_limit INTEGER NOT NULL CHECK (matches_limit >= 0),
    sort_order SMALLINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL
);

COMMENT ON TABLE public.tier_config IS
    'Canonical tier pricing (ngwee) and monthly match quotas. 99999 = unlimited.';

INSERT INTO public.tier_config (tier, display_name, price_ngwee, matches_limit, sort_order)
VALUES
    ('free', 'Free', 0, 10, 0),
    ('starter', 'Starter', 12500, 50, 1),
    ('professional', 'Professional', 25000, 125, 2),
    ('super_standard', 'Super Standard', 50000, 99999, 3)
ON CONFLICT (tier) DO NOTHING;

ALTER TABLE public.tier_config ENABLE ROW LEVEL SECURITY;

COMMIT;
