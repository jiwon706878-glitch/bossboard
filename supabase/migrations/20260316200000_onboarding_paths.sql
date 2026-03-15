-- =============================================================================
-- Onboarding Paths: steps column + assignments table
-- =============================================================================

-- Add steps jsonb to onboarding_paths if missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='onboarding_paths' AND column_name='steps') THEN
    ALTER TABLE public.onboarding_paths ADD COLUMN steps jsonb DEFAULT '[]';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='onboarding_paths' AND column_name='description') THEN
    ALTER TABLE public.onboarding_paths ADD COLUMN description text;
  END IF;
END $$;

-- Onboarding assignments table
CREATE TABLE IF NOT EXISTS public.onboarding_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  path_id uuid REFERENCES public.onboarding_paths(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.onboarding_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view assignments" ON public.onboarding_assignments FOR SELECT
  USING (business_id IN (SELECT public.get_user_workspace_ids()) OR user_id = auth.uid());
CREATE POLICY "Admins can create assignments" ON public.onboarding_assignments FOR INSERT
  WITH CHECK (business_id IN (SELECT public.get_user_workspace_ids()));
CREATE POLICY "Admins can update assignments" ON public.onboarding_assignments FOR UPDATE
  USING (business_id IN (SELECT public.get_user_workspace_ids()));
CREATE POLICY "Admins can delete assignments" ON public.onboarding_assignments FOR DELETE
  USING (business_id IN (SELECT public.get_user_workspace_ids()));

CREATE INDEX IF NOT EXISTS idx_onboarding_assignments_path ON public.onboarding_assignments(path_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_assignments_user ON public.onboarding_assignments(user_id);
