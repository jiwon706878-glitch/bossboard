-- =============================================================================
-- Fix RLS infinite recursion — ADAPTIVE VERSION
--
-- This migration detects whether each table uses 'workspace_id' or
-- 'business_id' and creates policies accordingly. It also handles the case
-- where the 'users' table or 'workspaces' table may not exist.
--
-- The get_user_workspace_ids() function returns IDs from businesses table
-- (where user_id = auth.uid()) and optionally from users table if it exists.
-- =============================================================================

-- 1. Create SECURITY DEFINER function to get workspace/business IDs
CREATE OR REPLACE FUNCTION public.get_user_workspace_ids()
RETURNS SETOF uuid
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  -- Always check businesses table (the app's primary source)
  RETURN QUERY SELECT id FROM public.businesses WHERE user_id = auth.uid();

  -- Also check users table if it exists and has workspace_id
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'workspace_id'
  ) THEN
    RETURN QUERY EXECUTE 'SELECT workspace_id FROM public.users WHERE id = auth.uid() AND workspace_id IS NOT NULL';
  END IF;
END;
$$;

-- Helper: check if user is owner/admin in workspace
CREATE OR REPLACE FUNCTION public.user_is_workspace_admin(ws_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  -- Business owner check
  IF EXISTS (SELECT 1 FROM public.businesses WHERE id = ws_id AND user_id = auth.uid()) THEN
    RETURN true;
  END IF;

  -- Users table admin/owner check (if table exists)
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'users'
  ) THEN
    RETURN EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND workspace_id = ws_id AND role IN ('owner', 'admin')
    );
  END IF;

  RETURN false;
END;
$$;


-- =============================================================================
-- 2. USERS table — fix recursion (only if table exists)
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
    -- Drop old policies
    DROP POLICY IF EXISTS "Users can view teammates" ON public.users;
    DROP POLICY IF EXISTS "Users can update self" ON public.users;
    DROP POLICY IF EXISTS "Users can insert self" ON public.users;

    CREATE POLICY "Users can view teammates" ON public.users FOR SELECT
      USING (workspace_id IN (SELECT public.get_user_workspace_ids()));

    CREATE POLICY "Users can update self" ON public.users FOR UPDATE
      USING (id = auth.uid());

    CREATE POLICY "Users can insert self" ON public.users FOR INSERT
      WITH CHECK (id = auth.uid());
  END IF;
END $$;


-- =============================================================================
-- 3. SOPS table — detect column name and fix policies
-- =============================================================================
DO $$
DECLARE
  col_name text;
BEGIN
  -- Detect the actual column name
  SELECT column_name INTO col_name
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'sops'
  AND column_name IN ('workspace_id', 'business_id')
  LIMIT 1;

  IF col_name IS NULL THEN
    RAISE NOTICE 'sops table has neither workspace_id nor business_id — skipping';
    RETURN;
  END IF;

  -- Drop ALL existing policies
  DROP POLICY IF EXISTS "Workspace members can view SOPs" ON public.sops;
  DROP POLICY IF EXISTS "Workspace members can create SOPs" ON public.sops;
  DROP POLICY IF EXISTS "Creator or admin can update SOPs" ON public.sops;
  DROP POLICY IF EXISTS "Creator or admin can delete SOPs" ON public.sops;
  DROP POLICY IF EXISTS "Workspace members can update SOPs" ON public.sops;
  DROP POLICY IF EXISTS "Workspace members can delete SOPs" ON public.sops;

  -- Create new policies using detected column name
  EXECUTE format(
    'CREATE POLICY "Workspace members can view SOPs" ON public.sops FOR SELECT USING (%I IN (SELECT public.get_user_workspace_ids()))',
    col_name
  );

  EXECUTE format(
    'CREATE POLICY "Workspace members can create SOPs" ON public.sops FOR INSERT WITH CHECK (%I IN (SELECT public.get_user_workspace_ids()))',
    col_name
  );

  EXECUTE format(
    'CREATE POLICY "Workspace members can update SOPs" ON public.sops FOR UPDATE USING (created_by = auth.uid() OR public.user_is_workspace_admin(%I))',
    col_name
  );

  EXECUTE format(
    'CREATE POLICY "Workspace members can delete SOPs" ON public.sops FOR DELETE USING (created_by = auth.uid() OR public.user_is_workspace_admin(%I))',
    col_name
  );

  RAISE NOTICE 'sops policies created using column: %', col_name;
END $$;


-- =============================================================================
-- 4. SOP_READS — fix policies
-- =============================================================================
DO $$
DECLARE
  sop_col text;
BEGIN
  -- Detect sops column name for the join
  SELECT column_name INTO sop_col
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'sops'
  AND column_name IN ('workspace_id', 'business_id')
  LIMIT 1;

  IF sop_col IS NULL THEN RETURN; END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sop_reads') THEN
    DROP POLICY IF EXISTS "Users can insert own reads" ON public.sop_reads;
    DROP POLICY IF EXISTS "Workspace members can view reads" ON public.sop_reads;
    DROP POLICY IF EXISTS "Users can update own reads" ON public.sop_reads;

    CREATE POLICY "Users can insert own reads" ON public.sop_reads FOR INSERT
      WITH CHECK (user_id = auth.uid());

    CREATE POLICY "Users can update own reads" ON public.sop_reads FOR UPDATE
      USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

    EXECUTE format(
      'CREATE POLICY "Workspace members can view reads" ON public.sop_reads FOR SELECT USING (EXISTS (SELECT 1 FROM public.sops WHERE sops.id = sop_reads.sop_id AND sops.%I IN (SELECT public.get_user_workspace_ids())))',
      sop_col
    );
  END IF;
END $$;


-- =============================================================================
-- 5. SOP_VERSIONS — fix policies
-- =============================================================================
DO $$
DECLARE
  sop_col text;
BEGIN
  SELECT column_name INTO sop_col
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'sops'
  AND column_name IN ('workspace_id', 'business_id')
  LIMIT 1;

  IF sop_col IS NULL THEN RETURN; END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sop_versions') THEN
    DROP POLICY IF EXISTS "Workspace members can view SOP versions" ON public.sop_versions;
    DROP POLICY IF EXISTS "Authenticated users can insert SOP versions" ON public.sop_versions;

    EXECUTE format(
      'CREATE POLICY "Workspace members can view SOP versions" ON public.sop_versions FOR SELECT USING (EXISTS (SELECT 1 FROM public.sops WHERE sops.id = sop_versions.sop_id AND sops.%I IN (SELECT public.get_user_workspace_ids())))',
      sop_col
    );

    CREATE POLICY "Authenticated users can insert SOP versions" ON public.sop_versions FOR INSERT
      WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;


-- =============================================================================
-- 6. CHECKLISTS — detect column name and fix policies
-- =============================================================================
DO $$
DECLARE
  col_name text;
BEGIN
  SELECT column_name INTO col_name
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'checklists'
  AND column_name IN ('workspace_id', 'business_id')
  LIMIT 1;

  IF col_name IS NULL THEN
    RAISE NOTICE 'checklists table has neither workspace_id nor business_id — skipping';
    RETURN;
  END IF;

  DROP POLICY IF EXISTS "Workspace members can view checklists" ON public.checklists;
  DROP POLICY IF EXISTS "Workspace members can create checklists" ON public.checklists;
  DROP POLICY IF EXISTS "Workspace members can update checklists" ON public.checklists;
  DROP POLICY IF EXISTS "Workspace members can delete checklists" ON public.checklists;

  EXECUTE format('CREATE POLICY "Workspace members can view checklists" ON public.checklists FOR SELECT USING (%I IN (SELECT public.get_user_workspace_ids()))', col_name);
  EXECUTE format('CREATE POLICY "Workspace members can create checklists" ON public.checklists FOR INSERT WITH CHECK (%I IN (SELECT public.get_user_workspace_ids()))', col_name);
  EXECUTE format('CREATE POLICY "Workspace members can update checklists" ON public.checklists FOR UPDATE USING (%I IN (SELECT public.get_user_workspace_ids()))', col_name);
  EXECUTE format('CREATE POLICY "Workspace members can delete checklists" ON public.checklists FOR DELETE USING (%I IN (SELECT public.get_user_workspace_ids()))', col_name);

  RAISE NOTICE 'checklists policies created using column: %', col_name;
END $$;


-- =============================================================================
-- 7. CHECKLIST_COMPLETIONS — fix policies
-- =============================================================================
DO $$
DECLARE
  cl_col text;
BEGIN
  SELECT column_name INTO cl_col
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'checklists'
  AND column_name IN ('workspace_id', 'business_id')
  LIMIT 1;

  IF cl_col IS NULL THEN RETURN; END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'checklist_completions') THEN
    DROP POLICY IF EXISTS "Workspace members can view completions" ON public.checklist_completions;
    DROP POLICY IF EXISTS "Users can insert own completions" ON public.checklist_completions;

    EXECUTE format(
      'CREATE POLICY "Workspace members can view completions" ON public.checklist_completions FOR SELECT USING (EXISTS (SELECT 1 FROM public.checklists WHERE checklists.id = checklist_completions.checklist_id AND checklists.%I IN (SELECT public.get_user_workspace_ids())))',
      cl_col
    );

    CREATE POLICY "Users can insert own completions" ON public.checklist_completions FOR INSERT
      WITH CHECK (completed_by = auth.uid());
  END IF;
END $$;


-- =============================================================================
-- 8. ONBOARDING_PATHS — detect column name and fix policies
-- =============================================================================
DO $$
DECLARE
  col_name text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'onboarding_paths') THEN
    RETURN;
  END IF;

  SELECT column_name INTO col_name
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'onboarding_paths'
  AND column_name IN ('workspace_id', 'business_id')
  LIMIT 1;

  IF col_name IS NULL THEN RETURN; END IF;

  DROP POLICY IF EXISTS "Workspace members can view onboarding paths" ON public.onboarding_paths;
  DROP POLICY IF EXISTS "Admins can create onboarding paths" ON public.onboarding_paths;
  DROP POLICY IF EXISTS "Admins can update onboarding paths" ON public.onboarding_paths;
  DROP POLICY IF EXISTS "Admins can delete onboarding paths" ON public.onboarding_paths;

  EXECUTE format('CREATE POLICY "Workspace members can view onboarding paths" ON public.onboarding_paths FOR SELECT USING (%I IN (SELECT public.get_user_workspace_ids()))', col_name);
  EXECUTE format('CREATE POLICY "Admins can create onboarding paths" ON public.onboarding_paths FOR INSERT WITH CHECK (public.user_is_workspace_admin(%I))', col_name);
  EXECUTE format('CREATE POLICY "Admins can update onboarding paths" ON public.onboarding_paths FOR UPDATE USING (public.user_is_workspace_admin(%I))', col_name);
  EXECUTE format('CREATE POLICY "Admins can delete onboarding paths" ON public.onboarding_paths FOR DELETE USING (public.user_is_workspace_admin(%I))', col_name);
END $$;


-- =============================================================================
-- 9. INVITES — detect column name and fix policies
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

  DROP POLICY IF EXISTS "Admins can view invites" ON public.invites;
  DROP POLICY IF EXISTS "Admins can create invites" ON public.invites;
  DROP POLICY IF EXISTS "Admins can update invites" ON public.invites;
  DROP POLICY IF EXISTS "Admins can delete invites" ON public.invites;
  DROP POLICY IF EXISTS "Workspace members can view invites" ON public.invites;
  DROP POLICY IF EXISTS "Workspace members can create invites" ON public.invites;
  DROP POLICY IF EXISTS "Workspace members can update invites" ON public.invites;
  DROP POLICY IF EXISTS "Workspace members can delete invites" ON public.invites;

  EXECUTE format('CREATE POLICY "Workspace members can view invites" ON public.invites FOR SELECT USING (%I IN (SELECT public.get_user_workspace_ids()))', col_name);
  EXECUTE format('CREATE POLICY "Workspace members can create invites" ON public.invites FOR INSERT WITH CHECK (%I IN (SELECT public.get_user_workspace_ids()))', col_name);
  EXECUTE format('CREATE POLICY "Workspace members can update invites" ON public.invites FOR UPDATE USING (%I IN (SELECT public.get_user_workspace_ids()))', col_name);
  EXECUTE format('CREATE POLICY "Workspace members can delete invites" ON public.invites FOR DELETE USING (%I IN (SELECT public.get_user_workspace_ids()))', col_name);
END $$;
