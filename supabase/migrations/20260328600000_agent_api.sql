-- =============================================================================
-- Agent API: api_keys + activity log
-- =============================================================================

-- API keys
CREATE TABLE IF NOT EXISTS public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  key_hash text NOT NULL,
  key_prefix text NOT NULL, -- first 8 chars for display
  name text NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  last_used_at timestamptz
);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners can manage keys" ON public.api_keys FOR ALL
  USING (business_id IN (SELECT public.get_user_workspace_ids()));

CREATE INDEX IF NOT EXISTS idx_api_keys_business ON public.api_keys(business_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON public.api_keys(key_hash);

-- Agent activity log
CREATE TABLE IF NOT EXISTS public.agent_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  api_key_id uuid REFERENCES public.api_keys(id) ON DELETE SET NULL,
  endpoint text NOT NULL,
  method text NOT NULL,
  status_code integer,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.agent_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners can view logs" ON public.agent_activity_log FOR SELECT
  USING (business_id IN (SELECT public.get_user_workspace_ids()));
CREATE POLICY "System can insert logs" ON public.agent_activity_log FOR INSERT
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_agent_log_business ON public.agent_activity_log(business_id);
CREATE INDEX IF NOT EXISTS idx_agent_log_created ON public.agent_activity_log(created_at DESC);

-- Agent notes (context writes)
CREATE TABLE IF NOT EXISTS public.agent_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  api_key_id uuid REFERENCES public.api_keys(id) ON DELETE SET NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.agent_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners can view notes" ON public.agent_notes FOR SELECT
  USING (business_id IN (SELECT public.get_user_workspace_ids()));
CREATE POLICY "System can insert notes" ON public.agent_notes FOR INSERT
  WITH CHECK (true);
