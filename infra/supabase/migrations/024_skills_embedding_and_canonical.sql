-- 024_skills_embedding_and_canonical.sql
--
-- Phase 2 Initiative #1 — Semantic skill matching foundations.
--
-- Adds the schema bits the resolver in apps/backend/app/services/skill_resolver.py
-- depends on: a trigram index for fuzzy matching, an embedding column +
-- HNSW index for vector matching, and a canonical_of pointer so admins
-- can merge duplicate skills without breaking foreign-key references.
--
-- Idempotent: every statement is gated on IF NOT EXISTS / CREATE OR
-- REPLACE so a partial re-run is safe.
--
-- Extensions assumed already installed (verified via list_extensions):
--   pg_trgm 1.6, vector 0.8.0
--
-- The vector(768) dimension MUST match cvs.embedding and jobs.embedding
-- (see migration 007). Skills, CVs, and jobs are scored against each
-- other for matching, so they need to share a coordinate space.

BEGIN;

-- ── Trigram index for Pass 2 of the resolver ───────────────────────
-- gin_trgm_ops is the operator class for trigram similarity (`%` / similarity()).
-- GIN is the right index type for set membership (trigram trigrams are sets).
CREATE INDEX IF NOT EXISTS idx_skills_name_trgm
  ON skills USING gin (name gin_trgm_ops);

-- ── Embedding column + HNSW index for Pass 3 ───────────────────────
-- Nullable so legacy rows survive the migration. The
-- scripts/backfill_skill_embeddings.py job populates them post-merge.
ALTER TABLE skills ADD COLUMN IF NOT EXISTS embedding vector(768);

-- HNSW params m=16, ef_construction=64 match the cvs/jobs indexes
-- (migration 001 + 007). Cosine ops matches the `<=>` operator the
-- resolver uses.
CREATE INDEX IF NOT EXISTS idx_skills_embedding_hnsw
  ON skills USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- ── Canonical_of pointer (admin merge metadata) ────────────────────
-- When an admin decides skill X is a duplicate of Y, set
-- skills.canonical_of = Y.id on X. The resolver follows the pointer
-- (max 5 hops; cycle-safe) so subsequent lookups land on the canonical
-- row. Existing user_skills / job_skills rows that point at X stay
-- valid — the BEFORE INSERT trigger in migration 025 rewrites future
-- writes, and scripts/backfill_canonicalize_job_skills.py rewrites
-- existing rows.
ALTER TABLE skills ADD COLUMN IF NOT EXISTS canonical_of UUID REFERENCES skills(id);
ALTER TABLE skills ADD COLUMN IF NOT EXISTS merged_at TIMESTAMPTZ;

-- Cheap partial index — most rows have canonical_of NULL, so the index
-- is small and helps the admin "show me what's been merged" queries.
CREATE INDEX IF NOT EXISTS idx_skills_canonical_of
  ON skills(canonical_of) WHERE canonical_of IS NOT NULL;

COMMENT ON COLUMN skills.embedding IS
  '768-dim Gemini embedding of the skill name. Matches cvs.embedding / '
  'jobs.embedding dimensions so skill <-> cv / skill <-> job cosine '
  'works without re-projection.';
COMMENT ON COLUMN skills.canonical_of IS
  'Pointer to the canonical id when this row is a confirmed duplicate. '
  'Set by admin merges; the resolver follows the chain (max depth 5).';
COMMENT ON COLUMN skills.merged_at IS
  'When canonical_of was set, for audit. NULL while the row is canonical.';

-- ── Analytics events (lightweight event log) ───────────────────────
-- The resolver writes one row per auto-insert so admins can audit the
-- new skills LLM extraction produces. Kept deliberately simple — schema
-- mirrors a Mixpanel/PostHog event shape so we can migrate to one of
-- those later without changing call sites.
--
-- No RLS by design: only the backend service role writes here, and only
-- admins read it. analytics_events isn't user-visible.
CREATE TABLE IF NOT EXISTS analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event TEXT NOT NULL,
    properties JSONB NOT NULL DEFAULT '{}'::jsonb,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_recent
  ON analytics_events(event, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user
  ON analytics_events(user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

COMMENT ON TABLE analytics_events IS
  'Backend-only event log. Writers: skill_resolver. Readers: admins.';

-- ── RPC: match_skill_trgm ─────────────────────────────────────────
-- Top-1 trigram-similar skill above the threshold. STABLE so PostgREST
-- can route it through GET and it benefits from the planner's caching.
-- Tie-break on shorter name so "java" wins over "javascript-2024" when
-- both score above 0.6 against the input "java".
CREATE OR REPLACE FUNCTION match_skill_trgm(
    query_name TEXT,
    sim_threshold REAL DEFAULT 0.6
) RETURNS TABLE(id UUID, name TEXT, similarity REAL)
LANGUAGE sql STABLE AS $$
    SELECT id,
           name,
           similarity(name, query_name)::REAL AS similarity
    FROM skills
    WHERE similarity(name, query_name) >= sim_threshold
    ORDER BY similarity(name, query_name) DESC, char_length(name) ASC
    LIMIT 1;
$$;

-- ── RPC: match_skill_vector ───────────────────────────────────────
-- Top-1 nearest neighbour by cosine distance; filtered by similarity
-- threshold AFTER the KNN so we still use the HNSW index.
--
-- pgvector's `<=>` returns cosine DISTANCE (0=identical, 2=opposite).
-- cosine_similarity = 1 - distance, so threshold 0.85 == distance 0.15.
CREATE OR REPLACE FUNCTION match_skill_vector(
    query_embedding vector(768),
    sim_threshold REAL DEFAULT 0.85
) RETURNS TABLE(id UUID, name TEXT, similarity REAL)
LANGUAGE sql STABLE AS $$
    WITH knn AS (
        SELECT id,
               name,
               (1 - (embedding <=> query_embedding))::REAL AS similarity
        FROM skills
        WHERE embedding IS NOT NULL
        ORDER BY embedding <=> query_embedding
        LIMIT 1
    )
    SELECT * FROM knn WHERE similarity >= sim_threshold;
$$;

COMMIT;
