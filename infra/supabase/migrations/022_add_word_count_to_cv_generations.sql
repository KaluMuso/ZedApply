-- 022_repair_cv_generations_body_columns.sql
--
-- HOTFIX (2026-05-15) — same family of bug as migration 020 (OTP code width).
-- The cv_generations table was created in migration 004 with only the bare
-- shape: id, user_id, job_title, company, created_at. The /api/v1/cv/generate
-- and /api/v1/cv/generations routes — and the frontend CVGenerationDetail /
-- CVGenerationSummary types — reference `content`, `word_count`, and (since
-- task #59) `metadata.sections`. None of those columns ever shipped.
--
-- Effect in production: /profile?tab=cv-generator returned 500 with
--
--   postgrest.exceptions.APIError: {'code': '42703',
--     'message': 'column cv_generations.word_count does not exist'}
--
-- which the browser reported as "CORS error" because uvicorn 500s strip
-- CORS headers (see feedback_zedcv_uvicorn_500_bypasses_cors.md).
--
-- This migration adds the three missing columns idempotently. The defaults
-- keep existing rows valid; new writes from the cv route will populate
-- content + word_count, and structured CVs from task #59 will populate
-- metadata.sections.

ALTER TABLE cv_generations
  ADD COLUMN IF NOT EXISTS content    TEXT    NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS word_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS metadata   JSONB   NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN cv_generations.content
  IS 'Generated CV body. Added by migration 022; should have shipped in 004.';
COMMENT ON COLUMN cv_generations.word_count
  IS 'Word count of the generated CV body. Set at write time by the API.';
COMMENT ON COLUMN cv_generations.metadata
  IS 'Free-form metadata, including metadata.sections for structured CV body '
     '(task #59). Backfilled to ''{}'' for pre-existing rows.';
