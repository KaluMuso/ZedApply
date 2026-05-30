-- 074: Idempotent billing email sends (renewal reminders, etc.)

BEGIN;

CREATE TABLE IF NOT EXISTS billing_email_log (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind        VARCHAR(40) NOT NULL
                CHECK (kind IN ('email_renewal_reminder')),
    period_end  DATE NOT NULL,
    sent_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, kind, period_end)
);

CREATE INDEX IF NOT EXISTS idx_billing_email_log_user_sent
    ON billing_email_log (user_id, sent_at DESC);

COMMENT ON TABLE billing_email_log IS
    'Dedupes transactional billing emails (renewal reminders) per user and billing period end date.';

ALTER TABLE billing_email_log ENABLE ROW LEVEL SECURITY;

COMMIT;
