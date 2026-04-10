-- Granular folder permissions
--
-- The existing folders.permissions jsonb handles coarse visibility
-- (who can see this folder). This new table adds fine-grained
-- read/write/admin/denied overrides for specific users or API keys.
--
-- Permission precedence (highest to lowest):
--   1. explicit denied entry    → blocked regardless of folders.permissions
--   2. explicit read/write/admin → granted access at that level
--   3. folders.permissions.visible_to → fallback coarse visibility
--   4. default: owner + members get read+write

CREATE TABLE IF NOT EXISTS public.folder_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id UUID REFERENCES public.folders(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  api_key_id UUID REFERENCES public.api_keys(id) ON DELETE CASCADE,
  permission TEXT NOT NULL CHECK (permission IN ('read', 'write', 'admin', 'denied')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- Either user_id or api_key_id must be set (not both, not neither)
  CONSTRAINT folder_perm_target_exclusive CHECK (
    (user_id IS NOT NULL AND api_key_id IS NULL) OR
    (user_id IS NULL AND api_key_id IS NOT NULL)
  )
);

-- Unique: one permission per target per folder
CREATE UNIQUE INDEX IF NOT EXISTS idx_folder_perm_user_unique
  ON public.folder_permissions(folder_id, user_id)
  WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_folder_perm_key_unique
  ON public.folder_permissions(folder_id, api_key_id)
  WHERE api_key_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_folder_perm_folder
  ON public.folder_permissions(folder_id);

ALTER TABLE public.folder_permissions ENABLE ROW LEVEL SECURITY;

-- Business members can view all folder permissions in their workspace
CREATE POLICY "Members view folder permissions" ON public.folder_permissions
  FOR SELECT USING (
    folder_id IN (
      SELECT f.id FROM public.folders f
      WHERE f.business_id IN (
        SELECT id FROM public.businesses WHERE user_id = auth.uid()
        UNION
        SELECT business_id FROM public.business_members WHERE user_id = auth.uid()
      )
    )
  );

-- Only business owners can create/update/delete folder permissions
CREATE POLICY "Owners manage folder permissions" ON public.folder_permissions
  FOR ALL USING (
    folder_id IN (
      SELECT f.id FROM public.folders f
      WHERE f.business_id IN (
        SELECT id FROM public.businesses WHERE user_id = auth.uid()
      )
    )
  );

-- Helper function to resolve effective permission for a user + folder
CREATE OR REPLACE FUNCTION public.get_folder_permission(
  p_folder_id UUID,
  p_user_id UUID
) RETURNS TEXT AS $$
DECLARE
  v_perm TEXT;
  v_is_owner BOOLEAN;
BEGIN
  -- Check if user is the business owner
  SELECT EXISTS (
    SELECT 1 FROM public.folders f
    INNER JOIN public.businesses b ON b.id = f.business_id
    WHERE f.id = p_folder_id AND b.user_id = p_user_id
  ) INTO v_is_owner;

  IF v_is_owner THEN
    RETURN 'admin';
  END IF;

  -- Check explicit user permission
  SELECT permission INTO v_perm
  FROM public.folder_permissions
  WHERE folder_id = p_folder_id AND user_id = p_user_id
  LIMIT 1;

  IF v_perm IS NOT NULL THEN
    RETURN v_perm;
  END IF;

  -- Fallback: member of the business → write
  IF EXISTS (
    SELECT 1 FROM public.folders f
    INNER JOIN public.business_members bm ON bm.business_id = f.business_id
    WHERE f.id = p_folder_id AND bm.user_id = p_user_id
  ) THEN
    RETURN 'write';
  END IF;

  RETURN 'denied';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
