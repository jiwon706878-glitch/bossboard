-- =============================================================================
-- Public document sharing
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.shared_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sop_id uuid REFERENCES public.sops(id) ON DELETE CASCADE NOT NULL,
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  token text UNIQUE NOT NULL,
  password_hash text, -- bcrypt hash, null = no password
  expires_at timestamptz, -- null = never
  allow_download boolean DEFAULT true,
  view_count integer DEFAULT 0,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.shared_links ENABLE ROW LEVEL SECURITY;

-- Public SELECT: anyone can read by token (needed for /share/[token] page)
CREATE POLICY "Anyone can read shared links" ON public.shared_links FOR SELECT
  USING (true);

-- Only business members can create/delete
CREATE POLICY "Members can create shared links" ON public.shared_links FOR INSERT
  WITH CHECK (business_id IN (SELECT public.get_user_workspace_ids()));

CREATE POLICY "Members can update shared links" ON public.shared_links FOR UPDATE
  USING (business_id IN (SELECT public.get_user_workspace_ids()));

CREATE POLICY "Members can delete shared links" ON public.shared_links FOR DELETE
  USING (business_id IN (SELECT public.get_user_workspace_ids()));

CREATE INDEX IF NOT EXISTS idx_shared_links_token ON public.shared_links(token);
CREATE INDEX IF NOT EXISTS idx_shared_links_sop ON public.shared_links(sop_id);
