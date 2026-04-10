CREATE TABLE IF NOT EXISTS public.cloudflare_purge_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL,
  success BOOLEAN DEFAULT true,
  purged_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_purge_log_date ON public.cloudflare_purge_log(purged_at DESC);

ALTER TABLE public.cloudflare_purge_log ENABLE ROW LEVEL SECURITY;

-- Only admins can read purge logs
CREATE POLICY "Admins can view purge logs" ON public.cloudflare_purge_log
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- System can insert (from API routes)
CREATE POLICY "System can insert purge logs" ON public.cloudflare_purge_log
  FOR INSERT WITH CHECK (true);
