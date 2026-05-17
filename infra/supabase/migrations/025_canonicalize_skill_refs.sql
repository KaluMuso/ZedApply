-- 025_canonicalize_skill_refs.sql
--
-- Phase 2 Initiative #1 — Defence-in-depth canonical_of normalization.
--
-- Migration 024 added skills.canonical_of so admins can merge duplicate
-- skill rows ("Postgres" → canonical "PostgreSQL"). The resolver
-- (apps/backend/app/services/skill_resolver.py) walks canonical_of in
-- application code before returning an id, so app-driven writes are
-- already canonical.
--
-- This migration adds a Postgres-side safety net: a BEFORE INSERT/UPDATE
-- trigger on user_skills and job_skills that rewrites NEW.skill_id to
-- the canonical id, so even raw SQL writes (admin SQL Editor, n8n
-- workflows, future ingestion paths) can't accidentally pin a
-- non-canonical reference.
--
-- Backfilling existing rows is NOT done here — see
-- scripts/backfill_canonicalize_job_skills.py for the application-layer
-- script that walks job_skills + user_skills through the resolver. That
-- script is run once after this migration is applied; see the post-merge
-- checklist in the PR description for the order.
--
-- Idempotent: CREATE OR REPLACE FUNCTION + DROP TRIGGER IF EXISTS +
-- CREATE TRIGGER means re-applying is safe.

BEGIN;

-- ── Canonical-walk helper ─────────────────────────────────────────
-- Walks skills.canonical_of up to 5 hops, returning the canonical id.
-- Matches the depth cap in the Python resolver so behaviour is
-- consistent across write paths.
--
-- IMMUTABLE is WRONG here (the result depends on table state); STABLE
-- is the right marker — same input + same snapshot returns the same id.
CREATE OR REPLACE FUNCTION canonicalize_skill_id(input_id UUID)
RETURNS UUID
LANGUAGE plpgsql STABLE AS $$
DECLARE
    cur UUID := input_id;
    nxt UUID;
    depth INT := 0;
BEGIN
    LOOP
        SELECT canonical_of INTO nxt FROM skills WHERE id = cur;
        EXIT WHEN nxt IS NULL OR depth >= 5;
        cur := nxt;
        depth := depth + 1;
    END LOOP;
    RETURN cur;
END;
$$;

-- ── Trigger function ─────────────────────────────────────────────
-- Single function reused by both triggers — same logic regardless of
-- which junction table we're writing to.
CREATE OR REPLACE FUNCTION trg_canonicalize_skill_ref()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.skill_id IS NOT NULL THEN
        NEW.skill_id := canonicalize_skill_id(NEW.skill_id);
    END IF;
    RETURN NEW;
END;
$$;

-- ── Apply to user_skills ─────────────────────────────────────────
-- Fires on every insert and on updates that touch skill_id (typical
-- pattern — proficiency-only updates don't re-walk). The application
-- already routes through resolve_skill_id so this is belt-and-braces.
DROP TRIGGER IF EXISTS user_skills_canonicalize ON user_skills;
CREATE TRIGGER user_skills_canonicalize
    BEFORE INSERT OR UPDATE OF skill_id ON user_skills
    FOR EACH ROW EXECUTE FUNCTION trg_canonicalize_skill_ref();

-- ── Apply to job_skills ─────────────────────────────────────────
DROP TRIGGER IF EXISTS job_skills_canonicalize ON job_skills;
CREATE TRIGGER job_skills_canonicalize
    BEFORE INSERT OR UPDATE OF skill_id ON job_skills
    FOR EACH ROW EXECUTE FUNCTION trg_canonicalize_skill_ref();

COMMENT ON FUNCTION canonicalize_skill_id(UUID) IS
  'Walk skills.canonical_of up to 5 hops; mirror of the Python '
  'resolver''s _follow_canonical helper.';
COMMENT ON FUNCTION trg_canonicalize_skill_ref() IS
  'BEFORE INSERT/UPDATE trigger: rewrites NEW.skill_id to the canonical '
  'id so non-application writes (SQL Editor, n8n, scrapers) can''t pin '
  'a non-canonical reference.';

COMMIT;
