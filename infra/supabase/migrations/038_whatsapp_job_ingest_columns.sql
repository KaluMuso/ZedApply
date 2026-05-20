-- 038_whatsapp_job_ingest_columns.sql
-- WhatsApp channel scraper: OCR audit trail + message-level dedup.

BEGIN;

-- WhatsApp channel ids exceed the original VARCHAR(20) source column.
ALTER TABLE public.jobs
    ALTER COLUMN source TYPE VARCHAR(128);

ALTER TABLE public.jobs
    ADD COLUMN IF NOT EXISTS ocr_source_text TEXT,
    ADD COLUMN IF NOT EXISTS whatsapp_message_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_whatsapp_message_id
    ON public.jobs (whatsapp_message_id)
    WHERE whatsapp_message_id IS NOT NULL;

COMMENT ON COLUMN public.jobs.ocr_source_text IS
    'Raw OCR / vision transcript for image-based WhatsApp job posts (audit).';
COMMENT ON COLUMN public.jobs.whatsapp_message_id IS
    'WAHA message id; prevents redelivery duplicates separate from fingerprint.';

COMMIT;
