-- 063: Trusted devices (skip login OTP) + OTP channel preference on users.
--
-- trusted_devices stores SHA-256 hashes of device trust tokens (never raw tokens).
-- otp_channel_preference: email default for new rows; existing users backfilled to
-- whatsapp to preserve current WhatsApp OTP behaviour.

BEGIN;

CREATE TABLE IF NOT EXISTS trusted_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_token_hash TEXT NOT NULL,
    device_label TEXT,
    ip_first_seen INET,
    ip_last_seen INET,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_trusted_devices_user
    ON trusted_devices(user_id)
    WHERE revoked_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_trusted_devices_token
    ON trusted_devices(device_token_hash)
    WHERE revoked_at IS NULL;

ALTER TABLE trusted_devices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS trusted_devices_owner ON trusted_devices;
CREATE POLICY trusted_devices_owner ON trusted_devices
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS otp_channel_preference TEXT NOT NULL DEFAULT 'email'
        CHECK (otp_channel_preference IN ('email', 'whatsapp', 'both'));

COMMENT ON COLUMN users.otp_channel_preference IS
    'Login OTP delivery: email (free default), whatsapp (paid default), or both.';

-- Preserve WhatsApp OTP for accounts that exist at migration time.
-- Rows created after this migration keep the column default ('email').
UPDATE users
SET otp_channel_preference = 'whatsapp';

COMMIT;
