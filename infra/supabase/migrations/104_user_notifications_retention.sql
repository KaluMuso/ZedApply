-- 104: Bounded retention for user_notifications digest dedup ledger (migration 050).
--
-- user_notifications is NOT the in-app inbox (see notifications — migration 100).
-- Rows track (user_id, job_id, channel) already delivered; prune after 90 days so
-- dedup history does not grow without bound. After prune, a job may reappear in a
-- digest — acceptable for Phase 0.
--
-- Timestamp column is sent_at (050 has no created_at).
--
-- pg_cron: weekly Sunday 05:00 CAT (03:00 UTC). If extension missing, enable in
-- Supabase Dashboard → Database → Extensions, then re-run cron.schedule below or
-- import infra/n8n/user_notifications_prune_weekly.json (documented fallback).

BEGIN;

CREATE OR REPLACE FUNCTION public.prune_user_notifications()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    DELETE FROM public.user_notifications
     WHERE sent_at < NOW() - INTERVAL '90 days';

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;

COMMENT ON FUNCTION public.prune_user_notifications() IS
    'Deletes digest dedup rows older than 90 days from user_notifications (050). '
    'Returns rows deleted. Does not touch notifications inbox (100). '
    'Scheduled weekly via pg_cron job zedcv-prune-user-notifications.';

DO $zedcv_prune_user_notifications$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'zedcv-prune-user-notifications',
      '0 3 * * 0',
      $job$SELECT public.prune_user_notifications();$job$
    );
  ELSE
    RAISE NOTICE
      '104: pg_cron extension not installed — enable it in Supabase Dashboard, '
      'then re-run cron.schedule for job zedcv-prune-user-notifications, '
      'or schedule infra/n8n/user_notifications_prune_weekly.json.';
  END IF;
END;
$zedcv_prune_user_notifications$;

COMMIT;
