-- 015_cv_structured_sections.sql
--
-- Purpose:
--   Task #59 extends the LLM CV parser to emit a richer structured shape
--   under a new "sections" key inside the cvs.parsed_data jsonb column.
--   Because parsed_data is already jsonb, no schema-level DDL is needed
--   to STORE the new keys — Postgres jsonb is schemaless. This migration
--   exists to:
--
--     1. Pin the column comment so future reviewers / DBAs running \d+ cvs
--        see what shape parsed_data is supposed to carry.
--     2. Mark the migration sequence so the change is visible in
--        infra/supabase/migrations/ ordering (next migration is 016).
--
-- What goes into parsed_data["sections"] (canonical, mirrors
-- app/schemas/cv_sections.py CVSections):
--
--   header.linkedin_url / portfolio_url / github_url     (optional URLs)
--   professional_summary.text                            (1-3 sentences)
--   work_experience[]   {title, company, location, start_date, end_date,
--                        achievements[]}                  (max 15 entries)
--   education[]         {degree, institution, location, start_date,
--                        end_date, gpa, thesis}           (max 10)
--   certifications[]    {name, issuer, year, expiry}      (max 25)
--   languages[]         {name, proficiency in {native|fluent|
--                        conversational|basic}}           (max 10)
--   projects[]          {name, role, technologies[], outcome} (max 15)
--   achievements[]      {title, year}                     (max 20)
--   publications[]      {title, venue, year, url}         (max 20)
--   memberships[]       {organisation, role, year_started,
--                        year_ended}                      (max 15)
--   volunteer_work[]    {organisation, role, start_date,
--                        end_date, description}           (max 10)
--   references[]        {name, title, organisation, phone, email} (max 6)
--
--   The flat top-level keys (full_name, email, phone, location,
--   years_experience, skills, experience_summary, education, confidence)
--   remain unchanged for backwards compatibility — code that reads them
--   directly (matching, /profile summary builder) keeps working without
--   modification. The structured "sections" object is additive.
--
-- Backwards compatibility:
--   Existing rows that pre-date this migration simply don't have the
--   "sections" key. The frontend treats `cv_sections == null` as "show
--   the empty state for these surfaces", and the Generator falls back
--   to parseCv.ts (free-text mode) when reading legacy cv_generations
--   rows. No backfill is needed for read paths.
--
-- Future search index (deferred to task #72):
--   A `tsvector GENERATED ALWAYS AS (...) STORED` column would let us
--   do hybrid lexical + vector search across structured fields. It's
--   deliberately NOT added here because (a) the IMMUTABLE expression
--   needed to flatten a nested jsonb shape is non-trivial and we'd
--   prefer to design it alongside the actual search query in #72,
--   and (b) a STORED tsvector adds write cost on every CV upload
--   even before the index goes in. See task #72 for the design slice.
--
-- Apply ordering: 015 after 014. Idempotent: COMMENT ON is overwrite-safe.

BEGIN;

COMMENT ON COLUMN public.cvs.parsed_data IS
$comment$
JSONB blob produced by app.services.cv_parser.

Flat keys (legacy, always present): full_name, email, phone, location,
years_experience, skills (string[]), experience_summary, education
(string[]), confidence (0-1 float).

Structured key (task #59, additive, optional): "sections" - mirrors
app.schemas.cv_sections.CVSections. See migration 015 header for the
full key list. Rows uploaded before 015 will not have this key; reads
must treat it as nullable.
$comment$;

COMMIT;
