-- =============================================================================
-- Comprehensive RLS fix for all tables
--
-- Creates the helper functions and recreates all RLS policies that depend on
-- them. This is self-contained and idempotent — safe to run multiple times.
--
-- Tables fixed: sops, checklists, folders, sop_reads, sop_versions,
--   checklist_completions, onboarding_paths, onboarding_assignments,
--   todos, work_log, invites
-- =============================================================================


-- =============================================================================
-- 0. Helper functions
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_user_workspace_ids()
RETURNS SETOF uuid
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN QUERY SELECT id FROM public.businesses WHERE user_id = auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION public.user_is_workspace_admin(ws_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.businesses WHERE id = ws_id AND user_id = auth.uid()
  );
END;
$$;


-- =============================================================================
-- 1. SOPS
-- =============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sops' AND column_name = 'business_id'
  ) THEN
    ALTER TABLE public.sops
      ADD COLUMN business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_sops_business_id ON public.sops(business_id);
ALTER TABLE public.sops ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspace members can view SOPs" ON public.sops;
DROP POLICY IF EXISTS "Workspace members can create SOPs" ON public.sops;
DROP POLICY IF EXISTS "Workspace members can update SOPs" ON public.sops;
DROP POLICY IF EXISTS "Workspace members can delete SOPs" ON public.sops;
DROP POLICY IF EXISTS "Creator or admin can update SOPs" ON public.sops;
DROP POLICY IF EXISTS "Creator or admin can delete SOPs" ON public.sops;

CREATE POLICY "Workspace members can view SOPs" ON public.sops FOR SELECT
  USING (business_id IN (SELECT public.get_user_workspace_ids()));
CREATE POLICY "Workspace members can create SOPs" ON public.sops FOR INSERT
  WITH CHECK (business_id IN (SELECT public.get_user_workspace_ids()));
CREATE POLICY "Workspace members can update SOPs" ON public.sops FOR UPDATE
  USING (created_by = auth.uid() OR public.user_is_workspace_admin(business_id));
CREATE POLICY "Workspace members can delete SOPs" ON public.sops FOR DELETE
  USING (created_by = auth.uid() OR public.user_is_workspace_admin(business_id));


-- =============================================================================
-- 2. FOLDERS
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'folders') THEN
    DROP POLICY IF EXISTS "Members can view folders" ON public.folders;
    DROP POLICY IF EXISTS "Members can create folders" ON public.folders;
    DROP POLICY IF EXISTS "Members can update folders" ON public.folders;
    DROP POLICY IF EXISTS "Members can delete folders" ON public.folders;

    CREATE POLICY "Members can view folders" ON public.folders FOR SELECT
      USING (business_id IN (SELECT public.get_user_workspace_ids()));
    CREATE POLICY "Members can create folders" ON public.folders FOR INSERT
      WITH CHECK (business_id IN (SELECT public.get_user_workspace_ids()));
    CREATE POLICY "Members can update folders" ON public.folders FOR UPDATE
      USING (business_id IN (SELECT public.get_user_workspace_ids()));
    CREATE POLICY "Members can delete folders" ON public.folders FOR DELETE
      USING (business_id IN (SELECT public.get_user_workspace_ids()));
  END IF;
END $$;


-- =============================================================================
-- 3. CHECKLISTS
-- =============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'checklists' AND column_name = 'business_id'
  ) THEN
    ALTER TABLE public.checklists
      ADD COLUMN business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_checklists_business_id ON public.checklists(business_id);
ALTER TABLE public.checklists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspace members can view checklists" ON public.checklists;
DROP POLICY IF EXISTS "Workspace members can create checklists" ON public.checklists;
DROP POLICY IF EXISTS "Workspace members can update checklists" ON public.checklists;
DROP POLICY IF EXISTS "Workspace members can delete checklists" ON public.checklists;

CREATE POLICY "Workspace members can view checklists" ON public.checklists FOR SELECT
  USING (business_id IN (SELECT public.get_user_workspace_ids()));
CREATE POLICY "Workspace members can create checklists" ON public.checklists FOR INSERT
  WITH CHECK (business_id IN (SELECT public.get_user_workspace_ids()));
CREATE POLICY "Workspace members can update checklists" ON public.checklists FOR UPDATE
  USING (business_id IN (SELECT public.get_user_workspace_ids()));
CREATE POLICY "Workspace members can delete checklists" ON public.checklists FOR DELETE
  USING (business_id IN (SELECT public.get_user_workspace_ids()));


-- =============================================================================
-- 4. SOP_READS
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sop_reads') THEN
    DROP POLICY IF EXISTS "Workspace members can view reads" ON public.sop_reads;
    DROP POLICY IF EXISTS "Users can insert own reads" ON public.sop_reads;
    DROP POLICY IF EXISTS "Users can update own reads" ON public.sop_reads;

    CREATE POLICY "Workspace members can view reads" ON public.sop_reads FOR SELECT
      USING (EXISTS (
        SELECT 1 FROM public.sops
        WHERE sops.id = sop_reads.sop_id
        AND sops.business_id IN (SELECT public.get_user_workspace_ids())
      ));
    CREATE POLICY "Users can insert own reads" ON public.sop_reads FOR INSERT
      WITH CHECK (user_id = auth.uid());
    CREATE POLICY "Users can update own reads" ON public.sop_reads FOR UPDATE
      USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  END IF;
END $$;


-- =============================================================================
-- 5. SOP_VERSIONS
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sop_versions') THEN
    DROP POLICY IF EXISTS "Workspace members can view SOP versions" ON public.sop_versions;
    DROP POLICY IF EXISTS "Authenticated users can insert SOP versions" ON public.sop_versions;

    CREATE POLICY "Workspace members can view SOP versions" ON public.sop_versions FOR SELECT
      USING (EXISTS (
        SELECT 1 FROM public.sops
        WHERE sops.id = sop_versions.sop_id
        AND sops.business_id IN (SELECT public.get_user_workspace_ids())
      ));
    CREATE POLICY "Authenticated users can insert SOP versions" ON public.sop_versions FOR INSERT
      WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;


-- =============================================================================
-- 6. CHECKLIST_COMPLETIONS
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'checklist_completions') THEN
    DROP POLICY IF EXISTS "Workspace members can view completions" ON public.checklist_completions;
    DROP POLICY IF EXISTS "Users can insert own completions" ON public.checklist_completions;

    CREATE POLICY "Workspace members can view completions" ON public.checklist_completions FOR SELECT
      USING (EXISTS (
        SELECT 1 FROM public.checklists
        WHERE checklists.id = checklist_completions.checklist_id
        AND checklists.business_id IN (SELECT public.get_user_workspace_ids())
      ));
    CREATE POLICY "Users can insert own completions" ON public.checklist_completions FOR INSERT
      WITH CHECK (completed_by = auth.uid());
  END IF;
END $$;


-- =============================================================================
-- 7. ONBOARDING_PATHS
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'onboarding_paths') THEN
    DROP POLICY IF EXISTS "Workspace members can view onboarding paths" ON public.onboarding_paths;
    DROP POLICY IF EXISTS "Admins can create onboarding paths" ON public.onboarding_paths;
    DROP POLICY IF EXISTS "Admins can update onboarding paths" ON public.onboarding_paths;
    DROP POLICY IF EXISTS "Admins can delete onboarding paths" ON public.onboarding_paths;

    CREATE POLICY "Workspace members can view onboarding paths" ON public.onboarding_paths FOR SELECT
      USING (business_id IN (SELECT public.get_user_workspace_ids()));
    CREATE POLICY "Admins can create onboarding paths" ON public.onboarding_paths FOR INSERT
      WITH CHECK (public.user_is_workspace_admin(business_id));
    CREATE POLICY "Admins can update onboarding paths" ON public.onboarding_paths FOR UPDATE
      USING (public.user_is_workspace_admin(business_id));
    CREATE POLICY "Admins can delete onboarding paths" ON public.onboarding_paths FOR DELETE
      USING (public.user_is_workspace_admin(business_id));
  END IF;
END $$;


-- =============================================================================
-- 8. ONBOARDING_ASSIGNMENTS
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'onboarding_assignments') THEN
    DROP POLICY IF EXISTS "Members can view assignments" ON public.onboarding_assignments;
    DROP POLICY IF EXISTS "Admins can create assignments" ON public.onboarding_assignments;
    DROP POLICY IF EXISTS "Admins can update assignments" ON public.onboarding_assignments;
    DROP POLICY IF EXISTS "Admins can delete assignments" ON public.onboarding_assignments;

    CREATE POLICY "Members can view assignments" ON public.onboarding_assignments FOR SELECT
      USING (business_id IN (SELECT public.get_user_workspace_ids()) OR user_id = auth.uid());
    CREATE POLICY "Admins can create assignments" ON public.onboarding_assignments FOR INSERT
      WITH CHECK (business_id IN (SELECT public.get_user_workspace_ids()));
    CREATE POLICY "Admins can update assignments" ON public.onboarding_assignments FOR UPDATE
      USING (business_id IN (SELECT public.get_user_workspace_ids()));
    CREATE POLICY "Admins can delete assignments" ON public.onboarding_assignments FOR DELETE
      USING (business_id IN (SELECT public.get_user_workspace_ids()));
  END IF;
END $$;


-- =============================================================================
-- 9. TODOS
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'todos') THEN
    DROP POLICY IF EXISTS "Users can view own todos" ON public.todos;
    DROP POLICY IF EXISTS "Users can create todos" ON public.todos;
    DROP POLICY IF EXISTS "Users can update own todos" ON public.todos;
    DROP POLICY IF EXISTS "Users can delete own todos" ON public.todos;

    CREATE POLICY "Users can view own todos" ON public.todos FOR SELECT
      USING (user_id = auth.uid() OR business_id IN (SELECT public.get_user_workspace_ids()));
    CREATE POLICY "Users can create todos" ON public.todos FOR INSERT
      WITH CHECK (user_id = auth.uid());
    CREATE POLICY "Users can update own todos" ON public.todos FOR UPDATE
      USING (user_id = auth.uid());
    CREATE POLICY "Users can delete own todos" ON public.todos FOR DELETE
      USING (user_id = auth.uid());
  END IF;
END $$;


-- =============================================================================
-- 10. WORK_LOG
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'work_log') THEN
    DROP POLICY IF EXISTS "Members can view work log" ON public.work_log;
    DROP POLICY IF EXISTS "Users can insert work log" ON public.work_log;

    CREATE POLICY "Members can view work log" ON public.work_log FOR SELECT
      USING (business_id IN (SELECT public.get_user_workspace_ids()) OR user_id = auth.uid());
    CREATE POLICY "Users can insert work log" ON public.work_log FOR INSERT
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;


-- =============================================================================
-- 11. INVITES
-- =============================================================================
DO $$
DECLARE
  col_name text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'invites') THEN
    RETURN;
  END IF;

  SELECT column_name INTO col_name
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'invites'
  AND column_name IN ('workspace_id', 'business_id')
  LIMIT 1;

  IF col_name IS NULL THEN RETURN; END IF;

  DROP POLICY IF EXISTS "Workspace members can view invites" ON public.invites;
  DROP POLICY IF EXISTS "Workspace members can create invites" ON public.invites;
  DROP POLICY IF EXISTS "Workspace members can update invites" ON public.invites;
  DROP POLICY IF EXISTS "Workspace members can delete invites" ON public.invites;
  DROP POLICY IF EXISTS "Admins can view invites" ON public.invites;
  DROP POLICY IF EXISTS "Admins can create invites" ON public.invites;
  DROP POLICY IF EXISTS "Admins can update invites" ON public.invites;
  DROP POLICY IF EXISTS "Admins can delete invites" ON public.invites;

  EXECUTE format('CREATE POLICY "Workspace members can view invites" ON public.invites FOR SELECT USING (%I IN (SELECT public.get_user_workspace_ids()))', col_name);
  EXECUTE format('CREATE POLICY "Workspace members can create invites" ON public.invites FOR INSERT WITH CHECK (%I IN (SELECT public.get_user_workspace_ids()))', col_name);
  EXECUTE format('CREATE POLICY "Workspace members can update invites" ON public.invites FOR UPDATE USING (%I IN (SELECT public.get_user_workspace_ids()))', col_name);
  EXECUTE format('CREATE POLICY "Workspace members can delete invites" ON public.invites FOR DELETE USING (%I IN (SELECT public.get_user_workspace_ids()))', col_name);
END $$;
