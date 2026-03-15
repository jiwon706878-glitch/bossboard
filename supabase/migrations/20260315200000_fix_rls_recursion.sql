-- =============================================================================
-- Fix RLS infinite recursion
--
-- Problem: All RLS policies query public.users which itself has RLS enabled,
-- causing "infinite recursion detected in policy for relation users".
--
-- Solution: Create a SECURITY DEFINER function that bypasses RLS to look up
-- the user's workspace/business IDs, then rewrite all policies to use it.
--
-- In this app, workspace_id in sops/checklists = businesses.id,
-- and businesses.user_id = auth.uid(). The users table may not have rows.
-- So we check BOTH tables for workspace membership.
-- =============================================================================

-- 1. Create SECURITY DEFINER function to get workspace IDs for current user
CREATE OR REPLACE FUNCTION public.get_user_workspace_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  -- Check businesses table (primary source — app uses this)
  SELECT id FROM public.businesses WHERE user_id = auth.uid()
  UNION
  -- Check users table (from workspace schema, if rows exist)
  SELECT workspace_id FROM public.users WHERE id = auth.uid() AND workspace_id IS NOT NULL
$$;

-- Helper: check if user is owner/admin in workspace
CREATE OR REPLACE FUNCTION public.user_is_workspace_admin(ws_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    -- Business owner
    SELECT 1 FROM public.businesses WHERE id = ws_id AND user_id = auth.uid()
    UNION ALL
    -- Users table admin/owner role
    SELECT 1 FROM public.users WHERE id = auth.uid() AND workspace_id = ws_id AND role IN ('owner', 'admin')
  )
$$;


-- =============================================================================
-- 2. Fix USERS table policies (the root cause of recursion)
-- =============================================================================
DROP POLICY IF EXISTS "Users can view teammates" ON public.users;
DROP POLICY IF EXISTS "Users can update self" ON public.users;
DROP POLICY IF EXISTS "Users can insert self" ON public.users;

CREATE POLICY "Users can view teammates" ON public.users FOR SELECT
  USING (workspace_id IN (SELECT public.get_user_workspace_ids()));

CREATE POLICY "Users can update self" ON public.users FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "Users can insert self" ON public.users FOR INSERT
  WITH CHECK (id = auth.uid());


-- =============================================================================
-- 3. Fix SOPS policies
-- =============================================================================
DROP POLICY IF EXISTS "Workspace members can view SOPs" ON public.sops;
DROP POLICY IF EXISTS "Workspace members can create SOPs" ON public.sops;
DROP POLICY IF EXISTS "Creator or admin can update SOPs" ON public.sops;
DROP POLICY IF EXISTS "Creator or admin can delete SOPs" ON public.sops;

CREATE POLICY "Workspace members can view SOPs" ON public.sops FOR SELECT
  USING (workspace_id IN (SELECT public.get_user_workspace_ids()));

CREATE POLICY "Workspace members can create SOPs" ON public.sops FOR INSERT
  WITH CHECK (workspace_id IN (SELECT public.get_user_workspace_ids()));

CREATE POLICY "Workspace members can update SOPs" ON public.sops FOR UPDATE
  USING (
    created_by = auth.uid()
    OR public.user_is_workspace_admin(workspace_id)
  );

CREATE POLICY "Workspace members can delete SOPs" ON public.sops FOR DELETE
  USING (
    created_by = auth.uid()
    OR public.user_is_workspace_admin(workspace_id)
  );


-- =============================================================================
-- 4. Fix SOP_READS policies
-- =============================================================================
DROP POLICY IF EXISTS "Users can insert own reads" ON public.sop_reads;
DROP POLICY IF EXISTS "Workspace members can view reads" ON public.sop_reads;
DROP POLICY IF EXISTS "Users can update own reads" ON public.sop_reads;

CREATE POLICY "Users can insert own reads" ON public.sop_reads FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own reads" ON public.sop_reads FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Workspace members can view reads" ON public.sop_reads FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.sops
      WHERE sops.id = sop_reads.sop_id
      AND sops.workspace_id IN (SELECT public.get_user_workspace_ids())
    )
  );


-- =============================================================================
-- 5. Fix SOP_VERSIONS policies
-- =============================================================================
DROP POLICY IF EXISTS "Workspace members can view SOP versions" ON public.sop_versions;
DROP POLICY IF EXISTS "Authenticated users can insert SOP versions" ON public.sop_versions;

CREATE POLICY "Workspace members can view SOP versions" ON public.sop_versions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.sops
      WHERE sops.id = sop_versions.sop_id
      AND sops.workspace_id IN (SELECT public.get_user_workspace_ids())
    )
  );

CREATE POLICY "Authenticated users can insert SOP versions" ON public.sop_versions FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);


-- =============================================================================
-- 6. Fix CHECKLISTS policies
-- =============================================================================
DROP POLICY IF EXISTS "Workspace members can view checklists" ON public.checklists;
DROP POLICY IF EXISTS "Workspace members can create checklists" ON public.checklists;
DROP POLICY IF EXISTS "Workspace members can update checklists" ON public.checklists;
DROP POLICY IF EXISTS "Workspace members can delete checklists" ON public.checklists;

CREATE POLICY "Workspace members can view checklists" ON public.checklists FOR SELECT
  USING (workspace_id IN (SELECT public.get_user_workspace_ids()));

CREATE POLICY "Workspace members can create checklists" ON public.checklists FOR INSERT
  WITH CHECK (workspace_id IN (SELECT public.get_user_workspace_ids()));

CREATE POLICY "Workspace members can update checklists" ON public.checklists FOR UPDATE
  USING (workspace_id IN (SELECT public.get_user_workspace_ids()));

CREATE POLICY "Workspace members can delete checklists" ON public.checklists FOR DELETE
  USING (workspace_id IN (SELECT public.get_user_workspace_ids()));


-- =============================================================================
-- 7. Fix CHECKLIST_COMPLETIONS policies
-- =============================================================================
DROP POLICY IF EXISTS "Workspace members can view completions" ON public.checklist_completions;
DROP POLICY IF EXISTS "Users can insert own completions" ON public.checklist_completions;

CREATE POLICY "Workspace members can view completions" ON public.checklist_completions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.checklists
      WHERE checklists.id = checklist_completions.checklist_id
      AND checklists.workspace_id IN (SELECT public.get_user_workspace_ids())
    )
  );

CREATE POLICY "Users can insert own completions" ON public.checklist_completions FOR INSERT
  WITH CHECK (completed_by = auth.uid());


-- =============================================================================
-- 8. Fix ONBOARDING_PATHS policies
-- =============================================================================
DROP POLICY IF EXISTS "Workspace members can view onboarding paths" ON public.onboarding_paths;
DROP POLICY IF EXISTS "Admins can create onboarding paths" ON public.onboarding_paths;
DROP POLICY IF EXISTS "Admins can update onboarding paths" ON public.onboarding_paths;
DROP POLICY IF EXISTS "Admins can delete onboarding paths" ON public.onboarding_paths;

CREATE POLICY "Workspace members can view onboarding paths" ON public.onboarding_paths FOR SELECT
  USING (workspace_id IN (SELECT public.get_user_workspace_ids()));

CREATE POLICY "Admins can create onboarding paths" ON public.onboarding_paths FOR INSERT
  WITH CHECK (public.user_is_workspace_admin(workspace_id));

CREATE POLICY "Admins can update onboarding paths" ON public.onboarding_paths FOR UPDATE
  USING (public.user_is_workspace_admin(workspace_id));

CREATE POLICY "Admins can delete onboarding paths" ON public.onboarding_paths FOR DELETE
  USING (public.user_is_workspace_admin(workspace_id));


-- =============================================================================
-- 9. Fix INVITES policies
-- =============================================================================
DROP POLICY IF EXISTS "Admins can view invites" ON public.invites;
DROP POLICY IF EXISTS "Admins can create invites" ON public.invites;
DROP POLICY IF EXISTS "Admins can update invites" ON public.invites;
DROP POLICY IF EXISTS "Admins can delete invites" ON public.invites;

CREATE POLICY "Workspace members can view invites" ON public.invites FOR SELECT
  USING (workspace_id IN (SELECT public.get_user_workspace_ids()));

CREATE POLICY "Workspace members can create invites" ON public.invites FOR INSERT
  WITH CHECK (workspace_id IN (SELECT public.get_user_workspace_ids()));

CREATE POLICY "Workspace members can update invites" ON public.invites FOR UPDATE
  USING (workspace_id IN (SELECT public.get_user_workspace_ids()));

CREATE POLICY "Workspace members can delete invites" ON public.invites FOR DELETE
  USING (workspace_id IN (SELECT public.get_user_workspace_ids()));
