-- 011_widen_ai_cache_type_check.sql
--
-- Purpose:
--   The ai_cache.cache_type CHECK constraint (from 001_initial_schema.sql)
--   only allowed ('embedding','cv_parse','cover_letter','explanation') but
--   the application has shipped two more cache_type values since then:
--
--     - 'cv_analysis'   — apps/backend/app/api/v1/cv.py:196
--     - 'interview_prep'— apps/backend/app/api/v1/interview_prep.py:112
--
--   Both writes 500 with check_violation. /cv/analyze and /interview-prep
--   were silently broken on the cache-write path until Sentry surfaced the
--   error on 2026-05-10.
--
-- Architectural note (same as migration 008):
--   This is the third time in this audit cycle that a narrow CHECK
--   constraint from 001 has blocked a real feature (tier check x2 in 010,
--   payment_method in 008, cache_type here). The pattern argues for
--   dropping these constraints and validating at the application layer
--   (Pydantic enum at the input boundary, one place to add new values).
--   For now we just widen — that refactor is a separate slice.
--
-- Idempotency: DROP CONSTRAINT IF EXISTS + recreate with the wider set.
-- Safe to re-run.

BEGIN;

ALTER TABLE public.ai_cache
    DROP CONSTRAINT IF EXISTS ai_cache_cache_type_check;
ALTER TABLE public.ai_cache
    ADD CONSTRAINT ai_cache_cache_type_check
    CHECK (cache_type IN (
        'embedding',
        'cv_parse',
        'cv_analysis',     -- written by cv.py /analyze
        'cover_letter',
        'interview_prep',  -- written by interview_prep.py /generate
        'explanation'
    ));

COMMIT;
