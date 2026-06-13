-- Migration: 122_add_tenders_and_business_profiles.sql
-- Description: Creates business_profiles, tenders, and tender_embeddings tables, plus HNSW index and match_tenders RPC.

BEGIN;

-- ── 1. Create Business Profiles Table ──
CREATE TABLE IF NOT EXISTS public.business_profiles (
    id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    company_name TEXT NOT NULL,
    phone_number TEXT UNIQUE NOT NULL, -- For WhatsApp OTP login validation
    industry_tags TEXT[] DEFAULT '{}'::TEXT[],
    operating_provinces TEXT[] DEFAULT '{}'::TEXT[],
    company_bio TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE public.business_profiles ENABLE ROW LEVEL SECURITY;

-- Business Profiles Policies (Owner-restricted access)
DROP POLICY IF EXISTS business_profiles_select_own ON public.business_profiles;
CREATE POLICY business_profiles_select_own ON public.business_profiles
    FOR SELECT TO authenticated USING (id = auth.uid());

DROP POLICY IF EXISTS business_profiles_insert_own ON public.business_profiles;
CREATE POLICY business_profiles_insert_own ON public.business_profiles
    FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS business_profiles_update_own ON public.business_profiles;
CREATE POLICY business_profiles_update_own ON public.business_profiles
    FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS business_profiles_delete_own ON public.business_profiles;
CREATE POLICY business_profiles_delete_own ON public.business_profiles
    FOR DELETE TO authenticated USING (id = auth.uid());

-- Trigger to update updated_at
CREATE TRIGGER set_business_profiles_updated_at
    BEFORE UPDATE ON public.business_profiles
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_updated_at();


-- ── 2. Create Tenders Table ──
CREATE TABLE IF NOT EXISTS public.tenders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    procuring_entity TEXT NOT NULL,
    title TEXT NOT NULL,
    category TEXT NOT NULL, -- e.g., 'Works', 'Goods', 'Consulting'
    description TEXT,
    requirements TEXT,
    closing_date TIMESTAMPTZ NOT NULL,
    province TEXT DEFAULT 'National' NOT NULL,
    source_url TEXT,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE public.tenders ENABLE ROW LEVEL SECURITY;

-- Tenders Policies (Public Read, Service/Admin Write)
DROP POLICY IF EXISTS tenders_select_public ON public.tenders;
CREATE POLICY tenders_select_public ON public.tenders
    FOR SELECT TO public USING (is_active = true);

-- Trigger to update updated_at
CREATE TRIGGER set_tenders_updated_at
    BEFORE UPDATE ON public.tenders
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_updated_at();


-- ── 3. Create Tender Embeddings Table ──
CREATE TABLE IF NOT EXISTS public.tender_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tender_id UUID NOT NULL REFERENCES public.tenders(id) ON DELETE CASCADE,
    embedding VECTOR(768) NOT NULL, -- Aligned to gemini-embedding-001 (768d)
    content_chunk TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE public.tender_embeddings ENABLE ROW LEVEL SECURITY;

-- Embeddings Policies (Public Read)
DROP POLICY IF EXISTS tender_embeddings_select_public ON public.tender_embeddings;
CREATE POLICY tender_embeddings_select_public ON public.tender_embeddings
    FOR SELECT TO public USING (true);


-- ── 4. Create Indexes ──
CREATE INDEX IF NOT EXISTS idx_business_profiles_phone ON public.business_profiles(phone_number);
CREATE INDEX IF NOT EXISTS idx_tenders_closing_active ON public.tenders(is_active, closing_date DESC);
CREATE INDEX IF NOT EXISTS idx_tender_embeddings_tender_id ON public.tender_embeddings(tender_id);

-- HNSW Vector Index for Fast Cosine Similarity Searches
CREATE INDEX IF NOT EXISTS idx_tender_embeddings_vector ON public.tender_embeddings 
    USING hnsw (embedding vector_cosine_ops) 
    WITH (m = 16, ef_construction = 64);


-- ── 5. Create Tender Matching RPC ──
CREATE OR REPLACE FUNCTION public.match_tenders (
  p_query_embedding VECTOR(768),
  p_match_threshold FLOAT,
  p_match_count INT,
  p_industry_tags TEXT[],
  p_provinces TEXT[]
)
RETURNS TABLE (
  tender_id UUID,
  procuring_entity TEXT,
  title TEXT,
  similarity REAL,
  final_score REAL
)
LANGUAGE plpgsql STABLE AS $$
BEGIN
  RETURN QUERY
  WITH raw_matches AS (
    SELECT
      t.id AS t_id,
      t.procuring_entity AS t_procuring_entity,
      t.title AS t_title,
      (1 - (te.embedding <=> p_query_embedding))::REAL AS sim,
      (
        ((1 - (te.embedding <=> p_query_embedding)) * 40) + -- Semantic Weight (40%)
        (CASE WHEN t.category = ANY(p_industry_tags) THEN 30.0 ELSE 0.0 END) + -- Category Alignment (30%)
        (CASE WHEN t.province = ANY(p_provinces) OR t.province = 'National' THEN 20.0 ELSE 0.0 END) + -- Geographic Match (20%)
        (GREATEST(0.0, (1.0 - EXTRACT(EPOCH FROM (NOW() - t.created_at)) / (86400.0 * 30.0))) * 10.0) -- Deadline Urgency / Recency (10%)
      )::REAL AS score
    FROM public.tenders t
    JOIN public.tender_embeddings te ON t.id = te.tender_id
    WHERE t.is_active = true 
      AND (t.closing_date IS NULL OR t.closing_date >= CURRENT_DATE)
  ),
  deduplicated AS (
    SELECT DISTINCT ON (rm.t_id)
      rm.t_id,
      rm.t_procuring_entity,
      rm.t_title,
      rm.sim,
      rm.score
    FROM raw_matches rm
    WHERE rm.sim > p_match_threshold
    ORDER BY rm.t_id, rm.sim DESC
  )
  SELECT
    d.t_id,
    d.t_procuring_entity,
    d.t_title,
    d.sim,
    d.score
  FROM deduplicated d
  ORDER BY d.score DESC
  LIMIT p_match_count;
END;
$$;

COMMENT ON FUNCTION public.match_tenders(VECTOR(768), FLOAT, INT, TEXT[], TEXT[]) IS
    'Calculates hybrid tender matching: 40% semantic vector match + 30% category match + 20% geographic match + 10% recency.';

-- Grant execution to API consumers
GRANT EXECUTE ON FUNCTION public.match_tenders(VECTOR(768), FLOAT, INT, TEXT[], TEXT[]) 
    TO authenticated, anon, service_role;

COMMIT;
