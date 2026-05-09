-- 007_align_embedding_dim_to_768.sql
--
-- Purpose:
--   Reconcile the migration source with the live production schema for
--   embedding-vector columns. At some point in the project history the
--   embedding model was switched from OpenAI text-embedding-3-small (1536d)
--   to Google Gemini text-embedding-004 (768d). The change was applied
--   directly to the production Supabase project (chnesgmcuxyhwhzomdov), but
--   the migration source files (001_initial_schema.sql in particular) were
--   not updated. The Python backend's embedding_dimensions setting in
--   apps/backend/app/core/config.py is 768 and is the authoritative value;
--   do NOT change it.
--
--   As a result, anyone applying 001-006 to a fresh Supabase environment
--   would end up with vector(1536) columns into which the backend cannot
--   insert 768-dimensional Gemini embeddings — matching would silently
--   fail at INSERT time. This migration fixes that by bringing any
--   environment in line with prod.
--
-- Idempotency:
--   - Each ALTER is gated on the column actually being vector(1536). On
--     prod the columns are already vector(768), so the ALTERs are skipped.
--   - The HNSW index on jobs.embedding is only dropped+recreated when the
--     column was just altered, keeping prod a strict no-op (no index
--     rebuild).
--   - The match_jobs_for_user RPC is dropped under both possible
--     signatures (the stale source signature AND the live prod signature)
--     and then recreated with the canonical 768d signature in a single
--     transaction. On prod this replaces a working RPC with an identical
--     one; on a fresh clone it replaces the stale 1536d source RPC.
--
-- Out of scope: this migration assumes either a fresh clone (no data) or
-- prod (already 768). It does NOT handle the intermediate state of a
-- clone that has populated test data at vector(1536) — that case would
-- fail the ALTER and require manual intervention (TRUNCATE + re-embed).
-- USING NULL is safe here because pgvector cannot auto-cast across dim
-- mismatch. Branch only fires on fresh clones (zero rows in cvs/jobs).
--
-- Signature drift note (match_jobs_for_user):
--   Source 001 declared:
--     match_jobs_for_user(p_user_id uuid, p_limit integer, p_min_score real)
--     RETURNS TABLE(job_id, title VARCHAR, company VARCHAR, location VARCHAR, ...)
--   Prod currently has:
--     match_jobs_for_user(p_user_id uuid, p_min_score real, p_limit integer)
--     RETURNS TABLE(job_id, job_title TEXT, job_company TEXT, job_location TEXT, ...)
--   This migration adopts the prod signature as canonical. The body is
--   functionally identical (same scoring formula, same weights).
--
-- Apply ordering: run after 006. Do NOT apply against prod blindly —
-- prod is already aligned; landing this in source is sufficient. Apply on
-- the next deploy window if a redeploy from a clean state is required.

-- ── 1. cvs.embedding ─────────────────────────────────────────────────
DO $$
BEGIN
    IF (SELECT format_type(atttypid, atttypmod)
          FROM pg_attribute
         WHERE attrelid = 'public.cvs'::regclass
           AND attname  = 'embedding') = 'vector(1536)' THEN
        ALTER TABLE public.cvs
            ALTER COLUMN embedding TYPE vector(768) USING NULL;
    END IF;
END $$;

-- ── 2. jobs.embedding (+ dependent HNSW index) ───────────────────────
DO $$
DECLARE
    v_jobs_changed BOOLEAN := FALSE;
BEGIN
    IF (SELECT format_type(atttypid, atttypmod)
          FROM pg_attribute
         WHERE attrelid = 'public.jobs'::regclass
           AND attname  = 'embedding') = 'vector(1536)' THEN
        ALTER TABLE public.jobs
            ALTER COLUMN embedding TYPE vector(768) USING NULL;
        v_jobs_changed := TRUE;
    END IF;

    IF v_jobs_changed THEN
        DROP INDEX IF EXISTS public.idx_jobs_embedding;
        CREATE INDEX idx_jobs_embedding
            ON public.jobs USING hnsw (embedding vector_cosine_ops)
            WITH (m = 16, ef_construction = 64);
    END IF;
END $$;

-- ── 3. match_jobs_for_user RPC ───────────────────────────────────────
-- Drop both possible signatures so CREATE is unambiguous.
DROP FUNCTION IF EXISTS public.match_jobs_for_user(uuid, integer, real);
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
            j.id       AS j_id,
            j.title    AS j_title,
            j.company  AS j_company,
            j.location AS j_location,
            (1 - (j.embedding <=> v_user_embedding)) * 100 AS v_score,
            COALESCE(
                (SELECT COUNT(*)::REAL
                   FROM job_skills js2
                   JOIN skills s2 ON s2.id = js2.skill_id
                  WHERE js2.job_id = j.id AND s2.name = ANY(v_user_skills))
                / NULLIF((SELECT COUNT(*)::REAL FROM job_skills js3 WHERE js3.job_id = j.id), 0)
                * 100,
                0
            ) AS s_score,
            (CASE WHEN j.location = v_user_location THEN 30 ELSE 0 END +
             CASE WHEN j.quality_score > 70 THEN 20 ELSE 0 END +
             CASE WHEN j.closing_date > CURRENT_DATE THEN 20 ELSE 0 END +
             CASE WHEN j.posted_at > NOW() - INTERVAL '7 days' THEN 30 ELSE 0 END
            )::REAL AS b_score,
            ARRAY(SELECT s2.name
                    FROM job_skills js2
                    JOIN skills s2 ON s2.id = js2.skill_id
                   WHERE js2.job_id = j.id AND s2.name = ANY(v_user_skills)) AS m_skills,
            ARRAY(SELECT s2.name
                    FROM job_skills js2
                    JOIN skills s2 ON s2.id = js2.skill_id
                   WHERE js2.job_id = j.id AND NOT (s2.name = ANY(v_user_skills))) AS miss_skills
        FROM jobs j
        WHERE j.is_active = true AND j.embedding IS NOT NULL
    )
    SELECT
        js.j_id,
        js.j_title,
        js.j_company,
        js.j_location,
        js.v_score,
        js.s_score,
        js.b_score,
        (js.v_score * 0.6 + js.s_score * 0.3 + js.b_score * 0.1) AS f_score,
        js.m_skills,
        js.miss_skills
    FROM job_scores js
    WHERE (js.v_score * 0.6 + js.s_score * 0.3 + js.b_score * 0.1) >= p_min_score
    ORDER BY f_score DESC
    LIMIT p_limit;
END;
$$;
