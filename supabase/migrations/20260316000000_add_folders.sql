-- =============================================================================
-- Add folders table for SOP Wiki folder structure
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  parent_id uuid REFERENCES public.folders(id) ON DELETE CASCADE,
  sort_order integer DEFAULT 0,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view folders" ON public.folders FOR SELECT
  USING (business_id IN (SELECT public.get_user_workspace_ids()));

CREATE POLICY "Members can create folders" ON public.folders FOR INSERT
  WITH CHECK (business_id IN (SELECT public.get_user_workspace_ids()));

CREATE POLICY "Members can update folders" ON public.folders FOR UPDATE
  USING (business_id IN (SELECT public.get_user_workspace_ids()));

CREATE POLICY "Members can delete folders" ON public.folders FOR DELETE
  USING (business_id IN (SELECT public.get_user_workspace_ids()));

CREATE INDEX IF NOT EXISTS idx_folders_business_id ON public.folders(business_id);
CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON public.folders(parent_id);

-- Add folder_id to sops table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sops' AND column_name = 'folder_id'
  ) THEN
    ALTER TABLE public.sops ADD COLUMN folder_id uuid REFERENCES public.folders(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_sops_folder_id ON public.sops(folder_id);
  END IF;
END $$;
