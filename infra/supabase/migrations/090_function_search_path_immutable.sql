-- 090: Pin search_path on public functions flagged by Supabase advisor (lint 0011).
--
-- Without an explicit search_path, a malicious user could create objects in
-- another schema that shadow public tables and hijack SECURITY DEFINER or
-- trigger bodies. public, pg_catalog is the recommended Supabase hardening.
--
-- Idempotent: ALTER FUNCTION ... SET is safe to re-apply.

BEGIN;

-- Matching & scoring (highest priority)
ALTER FUNCTION public.match_jobs_for_user(uuid, real, integer)
    SET search_path = public, pg_catalog;

ALTER FUNCTION public.compute_experience_score(integer, integer, integer)
    SET search_path = public, pg_catalog;

ALTER FUNCTION public.match_skill_vector(vector, real)
    SET search_path = public, pg_catalog;

ALTER FUNCTION public.match_skill_trgm(text, real)
    SET search_path = public, pg_catalog;

-- Job lifecycle & heartbeat
ALTER FUNCTION public.deactivate_expired_jobs()
    SET search_path = public, pg_catalog;

ALTER FUNCTION public.calculate_job_quality(uuid)
    SET search_path = public, pg_catalog;

ALTER FUNCTION public.heartbeat()
    SET search_path = public, pg_catalog;

-- Triggers & user defaults
ALTER FUNCTION public.trigger_set_updated_at()
    SET search_path = public, pg_catalog;

ALTER FUNCTION public.trigger_calculate_quality()
    SET search_path = public, pg_catalog;

ALTER FUNCTION public.set_welcome_bonus()
    SET search_path = public, pg_catalog;

ALTER FUNCTION public.users_set_promotion_applied_until()
    SET search_path = public, pg_catalog;

-- Skills canonicalization
ALTER FUNCTION public.canonicalize_skill_id(uuid)
    SET search_path = public, pg_catalog;

ALTER FUNCTION public.trg_canonicalize_skill_ref()
    SET search_path = public, pg_catalog;

COMMIT;
