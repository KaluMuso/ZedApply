-- 064_job_expiration_cron.sql
--
-- Problem: jobs past closing_date stayed is_active=true and could surface in
-- admin views and any path that keys off is_active without the closing_date
-- filter in match_jobs_for_user.
--
-- Fix:
--   1. pg_cron daily at 04:30 CAT (02:30 UTC) calls deactivate_expired_jobs()
--   2. One-time backfill in this migration (NOTICE logs deactivated count)
--
-- pg_cron on Supabase: enable "pg_cron" in Dashboard → Database → Extensions
-- BEFORE applying. Do NOT run CREATE EXTENSION here — Supabase manages the
-- extension and re-running it triggers after-create.sql privilege revokes that
-- fail with "dependent privileges exist" (2BP01).
--
-- Verify after apply:
--   SELECT COUNT(*) FROM jobs
--   WHERE is_active = true AND closing_date < NOW()::date;
--   -- expected: 0
--
-- Idempotent: function is CREATE OR REPLACE; cron job is unscheduled then rescheduled.

BEGIN;

CREATE OR REPLACE FUNCTION public.deactivate_expired_jobs()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE public.jobs
    SET is_active = false,
        updated_at = NOW()
    WHERE is_active = true
      AND closing_date IS NOT NULL
      AND closing_date < NOW()::date;

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;

COMMENT ON FUNCTION public.deactivate_expired_jobs() IS
    'Sets is_active=false for jobs whose closing_date is before today. '
    'Returns the number of rows updated. Scheduled daily via pg_cron.';

-- 04:30 CAT (UTC+2, no DST) = 02:30 UTC. pg_cron uses UTC on Supabase.
DO $zedcv_expire$
DECLARE
    v_jobid BIGINT;
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        SELECT j.jobid
        INTO v_jobid
        FROM cron.job AS j
        WHERE j.jobname = 'zedcv-deactivate-expired-jobs';

        IF v_jobid IS NOT NULL THEN
            PERFORM cron.unschedule(v_jobid);
        END IF;

        PERFORM cron.schedule(
            'zedcv-deactivate-expired-jobs',
            '30 2 * * *',
            $$SELECT public.deactivate_expired_jobs();$$
        );
    ELSE
        RAISE NOTICE
            '064_job_expiration_cron: pg_cron not installed — enable it in '
            'Supabase Dashboard, then schedule job zedcv-deactivate-expired-jobs '
            '(30 2 * * * UTC → 04:30 CAT).';
    END IF;
END;
$zedcv_expire$;

DO $$
DECLARE
    v_pending BIGINT;
    v_deactivated INTEGER;
BEGIN
    SELECT COUNT(*)::BIGINT
    INTO v_pending
    FROM public.jobs
    WHERE is_active = true
      AND closing_date IS NOT NULL
      AND closing_date < NOW()::date;

    v_deactivated := public.deactivate_expired_jobs();

    RAISE NOTICE
        '064_job_expiration_cron backfill: pending=%, deactivated=%',
        v_pending,
        v_deactivated;
END;
$$;

COMMIT;
