-- Audit log for apply_url backfill runs (v2 per-aggregator parsers).
CREATE TABLE IF NOT EXISTS apply_url_backfill_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    old_apply_url TEXT,
    new_apply_url TEXT,
    apply_email TEXT,
    contact_phone TEXT,
    parser_name TEXT,
    parser_confidence REAL,
    dry_run BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_apply_url_backfill_log_job_id
    ON apply_url_backfill_log(job_id);

CREATE INDEX IF NOT EXISTS idx_apply_url_backfill_log_created_at
    ON apply_url_backfill_log(created_at DESC);

COMMENT ON TABLE apply_url_backfill_log IS
    'Audit trail for apply_url deep-link backfill (v2 per-aggregator parsers).';
