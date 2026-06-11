-- PR G: Drop 8 columns that are 100% NULL across all 603 jobs.
-- Verified live 2026-06-11 (COUNT() per column = 0).
--
-- Columns dropped:
--   ocr_source_text       — OCR pipeline never landed
--   whatsapp_message_id   — WhatsApp ingest never used this column
--   hybrid_days_per_week  — every active row has NULL employment_type
--   equity_offered        — only relevant for startup roles; never set
--   bonus_structure       — never extracted by LLM, never edited by admin
--   reporting_structure   — same
--   manages_others        — same
--   success_metrics       — same
--
-- Both jobs_user_facing and public_jobs views depend on these columns,
-- so we drop and recreate them within the same migration. The
-- visibility_status logic from jobs_user_facing is preserved verbatim.

BEGIN;

-- Step 1: drop dependent views.
DROP VIEW IF EXISTS public.public_jobs;
DROP VIEW IF EXISTS public.jobs_user_facing;

-- Step 2: drop the columns.
ALTER TABLE public.jobs
  DROP COLUMN IF EXISTS ocr_source_text,
  DROP COLUMN IF EXISTS whatsapp_message_id,
  DROP COLUMN IF EXISTS hybrid_days_per_week,
  DROP COLUMN IF EXISTS equity_offered,
  DROP COLUMN IF EXISTS bonus_structure,
  DROP COLUMN IF EXISTS reporting_structure,
  DROP COLUMN IF EXISTS manages_others,
  DROP COLUMN IF EXISTS success_metrics;

-- Step 3: recreate jobs_user_facing without the dropped columns.
-- visibility_status case-expression preserved verbatim from migration 095.
CREATE VIEW public.jobs_user_facing AS
SELECT id,
       title,
       company,
       location,
       description,
       requirements,
       salary_min,
       salary_max,
       apply_url,
       apply_email,
       source,
       source_url,
       quality_score,
       embedding,
       closing_date,
       is_active,
       posted_at,
       created_at,
       updated_at,
       employment_type,
       work_arrangement,
       benefits,
       tools_tech_stack,
       application_instructions,
       interview_process,
       company_description,
       reference_number,
       currency,
       pay_frequency,
       updated_by_user_id,
       admin_review_reason,
       admin_reviewed_at,
       admin_reviewed_by_user_id,
       experience_min_years,
       experience_max_years,
       seniority_level,
       qualifications_required,
       apply_source,
       enrichment_attempted_at,
       is_review_required,
       review_reason,
       description_markdown,
       contact_phone,
       source_platform,
       original_source_url,
       contact_email,
       contact_whatsapp,
       is_enriched,
       scraping_sources,
       admin_published,
       deactivation_reason,
       parent_listing_signature,
       section_responsibilities,
       section_requirements,
       section_benefits,
       section_how_to_apply,
       section_about,
       description_html,
       section_html,
       deep_enriched_at,
       closed_at,
       closure_reason,
       dedupe_key,
       CASE
           WHEN ((is_active IS TRUE) AND ((closing_date IS NULL) OR (closing_date >= CURRENT_DATE))) THEN 'open'::text
           WHEN ((is_active IS FALSE) AND (updated_at >= (now() - '3 days'::interval))) THEN 'recently_closed'::text
           WHEN ((closing_date IS NOT NULL) AND (closing_date < CURRENT_DATE) AND (closing_date >= (CURRENT_DATE - '3 days'::interval))) THEN 'recently_closed'::text
           ELSE 'archived'::text
       END AS visibility_status
  FROM public.jobs j;

-- Step 4: recreate public_jobs without the dropped columns.
CREATE VIEW public.public_jobs AS
SELECT id,
       title,
       company,
       location,
       description,
       requirements,
       salary_min,
       salary_max,
       apply_url,
       apply_email,
       source,
       source_url,
       quality_score,
       embedding,
       closing_date,
       is_active,
       posted_at,
       created_at,
       updated_at,
       employment_type,
       work_arrangement,
       benefits,
       tools_tech_stack,
       application_instructions,
       interview_process,
       company_description,
       reference_number,
       currency,
       pay_frequency,
       updated_by_user_id,
       admin_review_reason,
       admin_reviewed_at,
       admin_reviewed_by_user_id,
       experience_min_years,
       experience_max_years,
       seniority_level,
       qualifications_required,
       apply_source,
       enrichment_attempted_at,
       is_review_required,
       review_reason,
       description_markdown,
       contact_phone,
       source_platform,
       original_source_url,
       contact_email,
       contact_whatsapp,
       is_enriched,
       scraping_sources,
       admin_published
  FROM public.jobs
 WHERE ((is_active = true)
        AND (COALESCE(is_review_required, false) = false)
        AND ((apply_url IS NOT NULL)
             OR (apply_email IS NOT NULL)
             OR (contact_phone IS NOT NULL)
             OR (admin_published = true)));

COMMIT;
