-- 040 — Track 1: Row-Level Security for 10 previously unprotected tables
--
-- Verified against live DB 2026-05-20. service_role (backend) bypasses RLS.
-- Authenticated JWT must set auth.uid() to users.id (same pattern as 001/031).
--
-- USER-OWNED: self-access via user_id = auth.uid()
-- PUBLIC READ: skills, skill_aliases, job_skills, legal_docs (anon + authenticated)
-- SERVICE-ONLY: job_fingerprints, ai_cache (RLS on, no anon/authenticated policies)
-- legal_docs: RLS already enabled with zero policies — add SELECT only (do not re-ENABLE)

BEGIN;

-- ── otp_codes ─────────────────────────────────────────────────────
-- Live/prod may already have user_id; 001 only had phone. Add for drift-safe apply.
ALTER TABLE public.otp_codes
    ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_otp_codes_user_id ON public.otp_codes(user_id)
    WHERE user_id IS NOT NULL;

UPDATE public.otp_codes oc
SET user_id = u.id
FROM public.users u
WHERE oc.user_id IS NULL AND oc.phone = u.phone;

ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS otp_codes_select_own ON public.otp_codes;
CREATE POLICY otp_codes_select_own ON public.otp_codes
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- ── whatsapp_sessions ─────────────────────────────────────────────
ALTER TABLE public.whatsapp_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS whatsapp_sessions_select_own ON public.whatsapp_sessions;
CREATE POLICY whatsapp_sessions_select_own ON public.whatsapp_sessions
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS whatsapp_sessions_insert_own ON public.whatsapp_sessions;
CREATE POLICY whatsapp_sessions_insert_own ON public.whatsapp_sessions
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS whatsapp_sessions_update_own ON public.whatsapp_sessions;
CREATE POLICY whatsapp_sessions_update_own ON public.whatsapp_sessions
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- ── user_skills ───────────────────────────────────────────────────
ALTER TABLE public.user_skills ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_skills_select_own ON public.user_skills;
CREATE POLICY user_skills_select_own ON public.user_skills
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS user_skills_insert_own ON public.user_skills;
CREATE POLICY user_skills_insert_own ON public.user_skills
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS user_skills_update_own ON public.user_skills;
CREATE POLICY user_skills_update_own ON public.user_skills
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- ── application_outcomes ────────────────────────────────────────────
ALTER TABLE public.application_outcomes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS application_outcomes_select_own ON public.application_outcomes;
CREATE POLICY application_outcomes_select_own ON public.application_outcomes
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS application_outcomes_insert_own ON public.application_outcomes;
CREATE POLICY application_outcomes_insert_own ON public.application_outcomes
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- ── skills (public read) ──────────────────────────────────────────
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS skills_select_all ON public.skills;
CREATE POLICY skills_select_all ON public.skills
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- ── skill_aliases (public read) ───────────────────────────────────
ALTER TABLE public.skill_aliases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS skill_aliases_select_all ON public.skill_aliases;
CREATE POLICY skill_aliases_select_all ON public.skill_aliases
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- ── job_skills (public read) ────────────────────────────────────────
ALTER TABLE public.job_skills ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS job_skills_select_all ON public.job_skills;
CREATE POLICY job_skills_select_all ON public.job_skills
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- ── job_fingerprints (service_role only — no policies) ───────────────
ALTER TABLE public.job_fingerprints ENABLE ROW LEVEL SECURITY;

-- ── ai_cache (service_role only — no policies) ──────────────────────
ALTER TABLE public.ai_cache ENABLE ROW LEVEL SECURITY;

-- ── legal_docs (RLS already on; fix deny-all by adding SELECT) ─────
DROP POLICY IF EXISTS legal_docs_select_all ON public.legal_docs;
CREATE POLICY legal_docs_select_all ON public.legal_docs
    FOR SELECT
    TO anon, authenticated
    USING (true);

COMMIT;

COMMENT ON POLICY otp_codes_select_own ON public.otp_codes IS
    'Authenticated users read own OTP rows. Writes use service_role (backend /auth).';
COMMENT ON POLICY legal_docs_select_all ON public.legal_docs IS
    'Public legal pages before signup; writes via service_role admin API only.';
