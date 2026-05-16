-- 023_backfill_dropped_skills.sql
--
-- Recovers skills silently dropped by the pre-fix user_skills upsert path
-- in apps/backend/app/api/v1/cv.py (the per-skill loop at lines ~398-405
-- before the auto-insert fix landed in the same PR). cvs.parsed_data->'skills'
-- is the authoritative parser output and remained intact even when the
-- skills weren't propagated to user_skills.
--
-- Idempotent via both ON CONFLICT clauses; safe to run repeatedly. On a
-- repo where the code fix has already deployed, this no-ops for users
-- who've re-uploaded since.

BEGIN;

-- 1. Auto-insert every parsed skill across all CVs into the master table.
INSERT INTO skills (name, category)
SELECT DISTINCT LOWER(jsonb_array_elements_text(parsed_data->'skills')), 'auto'
FROM cvs
WHERE parsed_data ? 'skills'
ON CONFLICT (name) DO NOTHING;

-- 2. Backfill user_skills from each user's CV. JOIN on lowercased name is
-- belt-and-suspenders — the parser already lowercases via
-- CVParseResult._normalize_skill_case — but older parsed_data rows
-- pre-date that normalisation, so we keep the LOWER() on both sides.
INSERT INTO user_skills (user_id, skill_id, source)
SELECT DISTINCT c.user_id, s.id, 'cv_parse'
FROM cvs c
CROSS JOIN LATERAL jsonb_array_elements_text(c.parsed_data->'skills') AS skill_name
JOIN skills s ON LOWER(s.name) = LOWER(skill_name)
WHERE c.parsed_data ? 'skills'
ON CONFLICT (user_id, skill_id) DO NOTHING;

COMMIT;
