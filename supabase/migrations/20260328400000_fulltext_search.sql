-- =============================================================================
-- Full-text search indexes for SOPs
-- Uses 'simple' dictionary for Korean + English support
-- =============================================================================

-- Combined search vector on title + content (title weighted higher)
ALTER TABLE public.sops ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Populate existing rows
UPDATE public.sops SET search_vector =
  setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('simple', coalesce(summary, '')), 'B') ||
  setweight(to_tsvector('simple', coalesce(
    CASE WHEN jsonb_typeof(content) = 'object' THEN
      (SELECT string_agg(value::text, ' ')
       FROM jsonb_each_text(content)
       WHERE key = 'text' OR key = 'content')
    ELSE '' END
  , '')), 'C');

-- GIN index for fast full-text search
CREATE INDEX IF NOT EXISTS idx_sops_search_vector ON public.sops USING gin(search_vector);

-- Trigram index for fuzzy/partial matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_sops_title_trgm ON public.sops USING gin(title gin_trgm_ops);

-- Auto-update search_vector on insert/update
CREATE OR REPLACE FUNCTION public.sops_search_vector_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('simple', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.summary, '')), 'B');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sops_search_vector_trigger ON public.sops;
CREATE TRIGGER sops_search_vector_trigger
  BEFORE INSERT OR UPDATE OF title, summary, content ON public.sops
  FOR EACH ROW EXECUTE FUNCTION public.sops_search_vector_update();

-- RPC function for combined full-text + trigram search
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
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.title,
    s.summary,
    s.doc_type,
    s.status,
    s.updated_at,
    (
      COALESCE(ts_rank(s.search_vector, to_tsquery('simple', p_ts_query)), 0) * 2 +
      COALESCE(similarity(s.title, p_query), 0) * 3
    )::real AS rank
  FROM public.sops s
  WHERE s.business_id = p_business_id
    AND s.deleted_at IS NULL
    AND (
      s.search_vector @@ to_tsquery('simple', p_ts_query)
      OR s.title % p_query
      OR s.title ILIKE '%' || p_query || '%'
      OR s.summary ILIKE '%' || p_query || '%'
    )
  ORDER BY rank DESC, s.updated_at DESC
  LIMIT p_limit;
END;
$$;
