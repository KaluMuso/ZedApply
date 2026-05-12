-- 012: cv_upload_queue
-- Backs the "graceful degrade" path when Gemini hits its daily token cap.
-- Instead of returning 503 on /cv/upload, we stash the extracted text in
-- this queue with status='queued', return 202 to the user, and drain the
-- queue once quotas reset (currently via POST /admin/cv-queue/drain).
--
-- Idempotent: CREATE IF NOT EXISTS so re-applying is safe.

CREATE TABLE IF NOT EXISTS cv_upload_queue (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    -- Storage bucket path (cvs/{user_id}/{filename}) — already uploaded
    -- to Supabase storage at queue time, so the file survives a backend
    -- restart and the drain step doesn't need the original bytes.
    file_path text NOT NULL,
    file_type text NOT NULL,
    -- Extracted plain text. Kept here so we don't re-run PDF/DOCX/OCR
    -- extraction at drain time — that work was already done at queue time.
    -- Capped at 10k chars like cvs.raw_text.
    raw_text text NOT NULL,
    status text NOT NULL DEFAULT 'queued'
        CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
    -- Why this was queued. Lets us see if degrade is happening because of
    -- Gemini quota vs the user's own per-IP rate limit vs admin pause.
    reason text NOT NULL DEFAULT 'gemini_rate_limit',
    error_message text,
    attempts integer NOT NULL DEFAULT 0,
    queued_at timestamptz NOT NULL DEFAULT NOW(),
    processed_at timestamptz,
    updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS cv_upload_queue_drain_idx
    ON cv_upload_queue (status, queued_at)
    WHERE status = 'queued';

CREATE INDEX IF NOT EXISTS cv_upload_queue_user_idx
    ON cv_upload_queue (user_id, queued_at DESC);

ALTER TABLE cv_upload_queue ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'cv_upload_queue'
          AND policyname = 'users see own queued cvs'
    ) THEN
        EXECUTE 'CREATE POLICY "users see own queued cvs" ON cv_upload_queue
                 FOR SELECT USING (auth.uid()::text = user_id::text)';
    END IF;
END $$;
