-- 014_filter_expired_from_matching.sql
--
-- Purpose:
--   The match_jobs_for_user() RPC defined in 009 already AWARDS a bonus
--   when closing_date is in the future (line 137 of 009: `CASE WHEN
--   j.closing_date > CURRENT_DATE THEN 20 ELSE 0 END`), but it doesn't
--   FILTER expired jobs out. Result: jobs whose closing_date has passed
--   still surface on /matches with their vector + skill scores intact —
--   the user just sees a 0-bonus contribution. From a candidate's
--   perspective they're looking at dead listings they can no longer
--   apply to.
--
--   The 2026-05-14 surface audit confirmed this — the user reported
--   "date for matching jobs already passed, but not removed".
--
-- Fix:
--   Add `AND (j.closing_date IS NULL OR j.closing_date >= CURRENT_DATE)`
--   to the WHERE clause of the job_scores CTE. NULL closing_date is
--   preserved (many scraped jobs don't have one — that's not the same as
--   "expired"). Only rows with an explicit closing_date strictly in the
--   past are filtered out.
--
--   Everything else in the function is byte-identical to migration 009 —
--   same signature, same scoring formula, same casts, same ORDER BY,
--   same LIMIT.
--
-- Stale-matches cleanup:
--   Some matches table rows already point at now-expired jobs. They
--   would persist in the user's history even after the RPC filter
--   change. The trailing DELETE clears any rows that reference jobs
--   whose closing_date is more than 7 days in the past — a grace
--   window for "applied but not yet heard back" cases where the user
--   might still want the record. Adjust to `>= CURRENT_DATE` if you
--   want zero tolerance.
--
-- Idempotency: DROP FUNCTION IF EXISTS + CREATE; DELETE is a no-op on
-- subsequent runs once the stale rows are gone. Safe to re-run.
--
-- Apply ordering: 014 after 013.

BEGIN;

DROP FUNCTION IF EXISTS public.match_jobs_for_user(uuid, real, integer);

CREATE FUNCTION public.match_jobs_for_user(
    p_user_id    UUID,
    p_min_score  REAL    DEFAULT 50.0,
    p_limit      INTEGER DEFAULT 20
)
RETURNS TABLE (
    job_id          UUID,
    job_title       TEXT,
    job_company     TEXT,
    job_location    TEXT,
    vector_score    REAL,
    skill_score     REAL,
    bonus_score     REAL,
    final_score     REAL,
    matched_skills  TEXT[],
    missing_skills  TEXT[]
) LANGUAGE plpgsql AS $$
DECLARE
    v_user_embedding VECTOR(768);
    v_user_skills    TEXT[];
    v_user_location  VARCHAR;
BEGIN
    SELECT c.embedding INTO v_user_embedding
    FROM cvs c
    WHERE c.user_id = p_user_id AND c.is_primary = true
    LIMIT 1;

    IF v_user_embedding IS NULL THEN
        RAISE EXCEPTION 'User has no primary CV with embedding';
    END IF;

    SELECT ARRAY_AGG(s.name) INTO v_user_skills
    FROM user_skills us
    JOIN skills s ON s.id = us.skill_id
    WHERE us.user_id = p_user_id;

    SELECT u.location INTO v_user_location FROM users u WHERE u.id = p_user_id;

    RETURN QUERY
    WITH job_scores AS (
        SELECT
            j.id              AS j_id,
            j.title::TEXT     AS j_title,
            j.company::TEXT   AS j_company,
            j.location::TEXT  AS j_location,
            ((1 - (j.embedding <=> v_user_embedding)) * 100)::REAL AS v_score,
            (COALESCE(
                (SELECT COUNT(*)::REAL
                   FROM job_skills js2
                   JOIN skills s2 ON s2.id = js2.skill_id
                  WHERE js2.job_id = j.id AND s2.name = ANY(v_user_skills))
                / NULLIF((SELECT COUNT(*)::REAL FROM job_skills js3 WHERE js3.job_id = j.id), 0)
                * 100,
                0
            ))::REAL AS s_score,
            (CASE WHEN j.location = v_user_location THEN 30 ELSE 0 END +
             CASE WHEN j.quality_score > 70 THEN 20 ELSE 0 END +
             CASE WHEN j.closing_date > CURRENT_DATE THEN 20 ELSE 0 END +
             CASE WHEN j.posted_at > NOW() - INTERVAL '7 days' THEN 30 ELSE 0 END
            )::REAL AS b_score,
            ARRAY(SELECT s2.name
                    FROM job_skills js2
                    JOIN skills s2 ON s2.id = js2.skill_id
                   WHERE js2.job_id = j.id AND s2.name = ANY(v_user_skills))::TEXT[] AS m_skills,
            ARRAY(SELECT s2.name
                    FROM job_skills js2
                    JOIN skills s2 ON s2.id = js2.skill_id
                   WHERE js2.job_id = j.id AND NOT (s2.name = ANY(v_user_skills)))::TEXT[] AS miss_skills
        FROM jobs j
        WHERE j.is_active = true
          AND j.embedding IS NOT NULL
          -- 014: drop expired jobs. NULL closing_date means "no deadline
          -- provided" and is preserved; only past dates are filtered out.
          AND (j.closing_date IS NULL OR j.closing_date >= CURRENT_DATE)
    )
    SELECT
        js.j_id,
        js.j_title,
        js.j_company,
        js.j_location,
        js.v_score,
        js.s_score,
        js.b_score,
        (js.v_score * 0.6 + js.s_score * 0.3 + js.b_score * 0.1)::REAL AS f_score,
        js.m_skills,
        js.miss_skills
    FROM job_scores js
    WHERE (js.v_score * 0.6 + js.s_score * 0.3 + js.b_score * 0.1) >= p_min_score
    ORDER BY f_score DESC
    LIMIT p_limit;
END;
$$;

-- One-off cleanup: drop matches rows for jobs whose closing_date has
-- been past for more than 7 days. The 7-day grace lets a user still
-- see "I applied to that one" history in the very-recently-expired
-- window. Adjust the interval if you want a strict cutoff.
DELETE FROM public.matches
WHERE job_id IN (
    SELECT id FROM public.jobs
    WHERE closing_date IS NOT NULL
      AND closing_date < CURRENT_DATE - INTERVAL '7 days'
);

COMMIT;
