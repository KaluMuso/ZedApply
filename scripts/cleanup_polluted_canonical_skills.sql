-- Remove sentence-like rows from canonical_skills (run in Supabase SQL editor).
-- Review SELECT output before DELETE. job_skills FK rows cascade on delete.

-- Shared pollution predicate (keep SELECT / COUNT / DELETE in sync)
--   * Too long (>60 chars)
--   * Qualification / requirement phrases
--   * Trailing sentence punctuation
--   * More than 4 words (atomic skills are short)
--   * Comma-separated lists (not atomic skills)
--   * Soft-skill sentence openers (scraper boilerplate)

-- Identify polluted rows
SELECT id, name
FROM canonical_skills
WHERE length(name) > 60
   OR name ~ '(Years|Experience|Minimum|Must|Should|Required|Bachelor|Diploma|Certificate|Membership|Qualification|Knowledge of|Ability to)'
   OR name LIKE '%.'
   OR name LIKE '%,%'
   OR name LIKE '%:%'
   OR name ~* 'lincence'
   OR name ~* '^(Honest,|Strong |Good |Excellent |Ability to |Knowledge of |Physically |Clean )'
   OR cardinality(regexp_split_to_array(trim(name), '\s+')) > 4;

-- Count rows that would be deleted (run before DELETE)
SELECT COUNT(*) AS polluted_row_count
FROM canonical_skills
WHERE length(name) > 60
   OR name ~ '(Years|Experience|Minimum|Must|Should|Required|Bachelor|Diploma|Certificate|Membership|Qualification|Knowledge of|Ability to)'
   OR name LIKE '%.'
   OR name LIKE '%,%'
   OR name LIKE '%:%'
   OR name ~* 'lincence'
   OR name ~* '^(Honest,|Strong |Good |Excellent |Ability to |Knowledge of |Physically |Clean )'
   OR cardinality(regexp_split_to_array(trim(name), '\s+')) > 4;

-- After review, delete polluted rows
DELETE FROM canonical_skills
WHERE length(name) > 60
   OR name ~ '(Years|Experience|Minimum|Must|Should|Required|Bachelor|Diploma|Certificate|Membership|Qualification|Knowledge of|Ability to)'
   OR name LIKE '%.'
   OR name LIKE '%,%'
   OR name LIKE '%:%'
   OR name ~* 'lincence'
   OR name ~* '^(Honest,|Strong |Good |Excellent |Ability to |Knowledge of |Physically |Clean )'
   OR cardinality(regexp_split_to_array(trim(name), '\s+')) > 4;

-- Post-cleanup sanity checks
SELECT COUNT(*) AS total_remaining FROM canonical_skills;

SELECT COUNT(*) AS names_longer_than_40
FROM canonical_skills
WHERE length(name) > 40;

SELECT name, cardinality(regexp_split_to_array(trim(name), '\s+')) AS word_count
FROM canonical_skills
ORDER BY length(name) DESC
LIMIT 20;
