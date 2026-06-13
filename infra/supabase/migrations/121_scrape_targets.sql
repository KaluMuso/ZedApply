-- Migration: 121_scrape_targets.sql
-- Description: Creates the scrape_targets table for dynamic LLM-powered scraping.

CREATE TABLE IF NOT EXISTS public.scrape_targets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name TEXT NOT NULL,
    url TEXT NOT NULL,
    cron_interval_hours INTEGER NOT NULL DEFAULT 72,
    last_scraped_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.scrape_targets ENABLE ROW LEVEL SECURITY;

-- Only admins can view/modify scrape targets
CREATE POLICY "Admins can manage scrape targets" 
    ON public.scrape_targets 
    FOR ALL 
    TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role = 'superadmin'
        )
    );

-- Trigger to update updated_at
CREATE TRIGGER set_scrape_targets_updated_at
    BEFORE UPDATE ON public.scrape_targets
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_updated_at();
