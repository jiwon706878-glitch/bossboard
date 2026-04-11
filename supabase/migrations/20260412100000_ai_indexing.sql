-- ============================================================================
-- Auto-indexing fields for SOPs — BB v2.0 Day 2
-- ----------------------------------------------------------------------------
-- Adds Gemini-generated metadata (summary / keywords / synonyms) to the
-- existing sops table. The original spec referenced `wiki_pages` which
-- does not exist in this codebase — the actual wiki table is `sops`.
--
-- The existing sops_search_vector_update trigger (20260328400000) is
-- extended to (a) include the new AI fields in the tsvector so search
-- automatically benefits and (b) flip ai_index_pending=true whenever
-- content changes. The dashboard saves via the client-side Supabase
-- SDK, so a DB-side flag is the only way to reliably mark pages for
-- re-indexing — the client then POSTs /api/sops/[id]/reindex to
-- actually fire the debounced Gemini call.
-- ============================================================================

-- 1. New columns on sops
ALTER TABLE public.sops
  ADD COLUMN IF NOT EXISTS ai_summary TEXT;

ALTER TABLE public.sops
  ADD COLUMN IF NOT EXISTS ai_keywords TEXT[];

ALTER TABLE public.sops
  ADD COLUMN IF NOT EXISTS ai_synonyms TEXT[];

ALTER TABLE public.sops
  ADD COLUMN IF NOT EXISTS ai_indexed_at TIMESTAMPTZ;

ALTER TABLE public.sops
  ADD COLUMN IF NOT EXISTS ai_index_pending BOOLEAN NOT NULL DEFAULT false;

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_sops_index_pending
  ON public.sops(ai_index_pending)
  WHERE ai_index_pending = true;

CREATE INDEX IF NOT EXISTS idx_sops_ai_keywords
  ON public.sops USING gin(ai_keywords);

CREATE INDEX IF NOT EXISTS idx_sops_ai_synonyms
  ON public.sops USING gin(ai_synonyms);

-- 3. Extend the existing search vector trigger to include AI fields
-- and to auto-mark the row as pending re-indexing when content changes.
-- Replacing the function preserves the trigger binding from 20260328400000.
CREATE OR REPLACE FUNCTION public.sops_search_vector_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('simple', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.summary, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(NEW.ai_summary, '')), 'B') ||
    setweight(
      to_tsvector(
        'simple',
        coalesce(array_to_string(NEW.ai_keywords, ' '), '')
      ),
      'B'
    ) ||
    setweight(
      to_tsvector(
        'simple',
        coalesce(array_to_string(NEW.ai_synonyms, ' '), '')
      ),
      'C'
    );

  -- Flag content changes for the auto-indexer. We only compare content
  -- on UPDATE; INSERTs don't need the flag because new rows will be
  -- indexed on first save anyway (the API route kicks off the same
  -- path post-save).
  IF TG_OP = 'UPDATE' AND NEW.content IS DISTINCT FROM OLD.content THEN
    NEW.ai_index_pending := true;
  END IF;

  RETURN NEW;
END;
$$;

-- The trigger binding already exists from 20260328400000_fulltext_search.sql;
-- CREATE OR REPLACE on the function is sufficient.

-- 4. Enhanced search RPC — boosts ai_keywords / ai_synonyms hits.
-- Drops + recreates search_sops to keep the function signature stable
-- for existing callers while adding the new ranking signals.
CREATE OR REPLACE FUNCTION public.search_sops(
  p_business_id uuid,
  p_query text,
  p_ts_query text,
  p_limit integer DEFAULT 20
)
RETURNS TABLE(
  id uuid,
  title text,
  summary text,
  doc_type text,
  status text,
  updated_at timestamptz,
  rank real
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _normalized_query text := lower(trim(p_query));
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.title,
    -- Prefer AI summary when available, otherwise the existing summary
    COALESCE(NULLIF(s.ai_summary, ''), s.summary) AS summary,
    s.doc_type,
    s.status,
    s.updated_at,
    (
      -- Existing full-text + title trigram signals
      COALESCE(ts_rank(s.search_vector, to_tsquery('simple', p_ts_query)), 0) * 2.0
      + COALESCE(similarity(s.title, p_query), 0) * 3.0
      -- New AI-metadata boosts: exact match on keyword > synonym
      + (CASE WHEN s.ai_keywords IS NOT NULL
              AND _normalized_query = ANY(
                SELECT lower(k) FROM unnest(s.ai_keywords) AS k
              ) THEN 1.5 ELSE 0 END)
      + (CASE WHEN s.ai_synonyms IS NOT NULL
              AND _normalized_query = ANY(
                SELECT lower(k) FROM unnest(s.ai_synonyms) AS k
              ) THEN 1.0 ELSE 0 END)
    )::real AS rank
  FROM public.sops s
  WHERE s.business_id = p_business_id
    AND s.deleted_at IS NULL
    AND (
      s.search_vector @@ to_tsquery('simple', p_ts_query)
      OR s.title % p_query
      OR s.title ILIKE '%' || p_query || '%'
      OR s.summary ILIKE '%' || p_query || '%'
      -- Match if the query appears in AI keywords/synonyms even when
      -- the FTS query returns nothing (e.g., Korean + rare terms)
      OR (s.ai_keywords IS NOT NULL AND _normalized_query = ANY(
           SELECT lower(k) FROM unnest(s.ai_keywords) AS k))
      OR (s.ai_synonyms IS NOT NULL AND _normalized_query = ANY(
           SELECT lower(k) FROM unnest(s.ai_synonyms) AS k))
    )
  ORDER BY rank DESC, s.updated_at DESC
  LIMIT p_limit;
END;
$$;
