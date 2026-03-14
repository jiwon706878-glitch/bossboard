-- =============================================================================
-- BossBoard Full Schema Migration
-- Created: 2026-03-14
--
-- This migration adds the core BossBoard tables for workspaces, users, SOPs,
-- checklists, onboarding paths, and team invites.
--
-- Existing tables (from prior migrations) are NOT recreated:
--   profiles, businesses, reviews, generated_content, ai_usage,
--   social_posts, scripts, subscriptions, waitlist
-- =============================================================================


-- =============================================================================
-- 1. WORKSPACES
-- Companies/teams that group users together
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  industry text,
  plan text DEFAULT 'free',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

-- Users can read their own workspace
CREATE POLICY "Users can view own workspace"
  ON public.workspaces FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.workspace_id = workspaces.id
      AND users.id = auth.uid()
    )
  );

-- Owners and admins can update workspace settings
CREATE POLICY "Admins can update workspace"
  ON public.workspaces FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.workspace_id = workspaces.id
      AND users.id = auth.uid()
      AND users.role IN ('owner', 'admin')
    )
  );

-- Authenticated users can create a workspace (e.g. during onboarding)
CREATE POLICY "Authenticated users can create workspace"
  ON public.workspaces FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);


-- =============================================================================
-- 2. USERS
-- Extends auth.users with workspace membership and role
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES public.workspaces(id),
  email text,
  full_name text,
  role text DEFAULT 'member',
  avatar_url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Users can read teammates in the same workspace
CREATE POLICY "Users can view teammates"
  ON public.users FOR SELECT
  USING (
    workspace_id IN (
      SELECT u.workspace_id FROM public.users u WHERE u.id = auth.uid()
    )
  );

-- Users can update their own record
CREATE POLICY "Users can update self"
  ON public.users FOR UPDATE
  USING (id = auth.uid());

-- Authenticated users can insert their own user record (onboarding)
CREATE POLICY "Users can insert self"
  ON public.users FOR INSERT
  WITH CHECK (id = auth.uid());


-- =============================================================================
-- 3. SOPs
-- Standard Operating Procedures — the core content of BossBoard
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.sops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title text NOT NULL,
  content jsonb,
  summary text,
  category text,
  status text DEFAULT 'draft',
  review_cycle_days int DEFAULT 90,
  last_reviewed_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  version int DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.sops ENABLE ROW LEVEL SECURITY;

-- Workspace members can read SOPs
CREATE POLICY "Workspace members can view SOPs"
  ON public.sops FOR SELECT
  USING (
    workspace_id IN (
      SELECT u.workspace_id FROM public.users u WHERE u.id = auth.uid()
    )
  );

-- Authenticated workspace members can create SOPs
CREATE POLICY "Workspace members can create SOPs"
  ON public.sops FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT u.workspace_id FROM public.users u WHERE u.id = auth.uid()
    )
  );

-- Creator or admin/owner can update SOPs
CREATE POLICY "Creator or admin can update SOPs"
  ON public.sops FOR UPDATE
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.workspace_id = sops.workspace_id
      AND users.role IN ('owner', 'admin')
    )
  );

-- Creator or admin/owner can delete SOPs
CREATE POLICY "Creator or admin can delete SOPs"
  ON public.sops FOR DELETE
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.workspace_id = sops.workspace_id
      AND users.role IN ('owner', 'admin')
    )
  );


-- =============================================================================
-- 4. SOP READ TRACKING
-- Tracks which users have read/signed off on each SOP
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.sop_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sop_id uuid REFERENCES public.sops(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at timestamptz DEFAULT now(),
  signed boolean DEFAULT false
);

ALTER TABLE public.sop_reads ENABLE ROW LEVEL SECURITY;

-- Users can record their own reads
CREATE POLICY "Users can insert own reads"
  ON public.sop_reads FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Workspace members can view read tracking for their workspace SOPs
CREATE POLICY "Workspace members can view reads"
  ON public.sop_reads FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.sops
      JOIN public.users ON users.workspace_id = sops.workspace_id
      WHERE sops.id = sop_reads.sop_id
      AND users.id = auth.uid()
    )
  );


-- =============================================================================
-- 5. SOP VERSIONS
-- Version history for SOPs
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.sop_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sop_id uuid REFERENCES public.sops(id) ON DELETE CASCADE,
  version int NOT NULL,
  content jsonb,
  changed_by uuid REFERENCES auth.users(id),
  change_summary text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.sop_versions ENABLE ROW LEVEL SECURITY;

-- Workspace members can read version history
CREATE POLICY "Workspace members can view SOP versions"
  ON public.sop_versions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.sops
      JOIN public.users ON users.workspace_id = sops.workspace_id
      WHERE sops.id = sop_versions.sop_id
      AND users.id = auth.uid()
    )
  );

-- System/authenticated users can insert versions (triggered on SOP update)
CREATE POLICY "Authenticated users can insert SOP versions"
  ON public.sop_versions FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);


-- =============================================================================
-- 6. CHECKLISTS
-- Actionable checklists derived from SOPs
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  sop_id uuid REFERENCES public.sops(id) ON DELETE SET NULL,
  title text NOT NULL,
  items jsonb,
  recurrence text,
  assigned_to uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.checklists ENABLE ROW LEVEL SECURITY;

-- Workspace members can view checklists
CREATE POLICY "Workspace members can view checklists"
  ON public.checklists FOR SELECT
  USING (
    workspace_id IN (
      SELECT u.workspace_id FROM public.users u WHERE u.id = auth.uid()
    )
  );

-- Workspace members can create checklists
CREATE POLICY "Workspace members can create checklists"
  ON public.checklists FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT u.workspace_id FROM public.users u WHERE u.id = auth.uid()
    )
  );

-- Workspace members can update checklists
CREATE POLICY "Workspace members can update checklists"
  ON public.checklists FOR UPDATE
  USING (
    workspace_id IN (
      SELECT u.workspace_id FROM public.users u WHERE u.id = auth.uid()
    )
  );

-- Workspace members can delete checklists
CREATE POLICY "Workspace members can delete checklists"
  ON public.checklists FOR DELETE
  USING (
    workspace_id IN (
      SELECT u.workspace_id FROM public.users u WHERE u.id = auth.uid()
    )
  );


-- =============================================================================
-- 7. CHECKLIST COMPLETIONS
-- Records of checklist completion by users
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.checklist_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id uuid REFERENCES public.checklists(id) ON DELETE CASCADE,
  completed_by uuid REFERENCES auth.users(id),
  items_completed jsonb,
  completed_at timestamptz DEFAULT now()
);

ALTER TABLE public.checklist_completions ENABLE ROW LEVEL SECURITY;

-- Workspace members can view completions for their workspace checklists
CREATE POLICY "Workspace members can view completions"
  ON public.checklist_completions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.checklists
      JOIN public.users ON users.workspace_id = checklists.workspace_id
      WHERE checklists.id = checklist_completions.checklist_id
      AND users.id = auth.uid()
    )
  );

-- Users can insert their own completions
CREATE POLICY "Users can insert own completions"
  ON public.checklist_completions FOR INSERT
  WITH CHECK (completed_by = auth.uid());


-- =============================================================================
-- 8. ONBOARDING PATHS
-- Ordered sequences of SOPs for onboarding new team members
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.onboarding_paths (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title text NOT NULL,
  sop_ids uuid[],
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.onboarding_paths ENABLE ROW LEVEL SECURITY;

-- Workspace members can view onboarding paths
CREATE POLICY "Workspace members can view onboarding paths"
  ON public.onboarding_paths FOR SELECT
  USING (
    workspace_id IN (
      SELECT u.workspace_id FROM public.users u WHERE u.id = auth.uid()
    )
  );

-- Admins/owners can create onboarding paths
CREATE POLICY "Admins can create onboarding paths"
  ON public.onboarding_paths FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.workspace_id = onboarding_paths.workspace_id
      AND users.role IN ('owner', 'admin')
    )
  );

-- Admins/owners can update onboarding paths
CREATE POLICY "Admins can update onboarding paths"
  ON public.onboarding_paths FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.workspace_id = onboarding_paths.workspace_id
      AND users.role IN ('owner', 'admin')
    )
  );

-- Admins/owners can delete onboarding paths
CREATE POLICY "Admins can delete onboarding paths"
  ON public.onboarding_paths FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.workspace_id = onboarding_paths.workspace_id
      AND users.role IN ('owner', 'admin')
    )
  );


-- =============================================================================
-- 9. INVITES
-- Team invitation tokens for workspace membership
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text DEFAULT 'member',
  token text UNIQUE NOT NULL,
  accepted boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

-- Workspace admins/owners can view invites
CREATE POLICY "Admins can view invites"
  ON public.invites FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.workspace_id = invites.workspace_id
      AND users.role IN ('owner', 'admin')
    )
  );

-- Workspace admins/owners can create invites
CREATE POLICY "Admins can create invites"
  ON public.invites FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.workspace_id = invites.workspace_id
      AND users.role IN ('owner', 'admin')
    )
  );

-- Workspace admins/owners can update invites (e.g. mark accepted)
CREATE POLICY "Admins can update invites"
  ON public.invites FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.workspace_id = invites.workspace_id
      AND users.role IN ('owner', 'admin')
    )
  );

-- Workspace admins/owners can delete invites
CREATE POLICY "Admins can delete invites"
  ON public.invites FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.workspace_id = invites.workspace_id
      AND users.role IN ('owner', 'admin')
    )
  );


-- =============================================================================
-- 10. INDEXES
-- Performance indexes for common query patterns
-- =============================================================================

-- SOPs: filter by workspace, status, and creator
CREATE INDEX IF NOT EXISTS idx_sops_workspace_id ON public.sops(workspace_id);
CREATE INDEX IF NOT EXISTS idx_sops_status ON public.sops(status);
CREATE INDEX IF NOT EXISTS idx_sops_created_by ON public.sops(created_by);
CREATE INDEX IF NOT EXISTS idx_sops_category ON public.sops(category);

-- SOP reads: lookup by sop and user
CREATE INDEX IF NOT EXISTS idx_sop_reads_sop_id ON public.sop_reads(sop_id);
CREATE INDEX IF NOT EXISTS idx_sop_reads_user_id ON public.sop_reads(user_id);

-- SOP versions: lookup by sop
CREATE INDEX IF NOT EXISTS idx_sop_versions_sop_id ON public.sop_versions(sop_id);

-- Checklists: filter by workspace and source SOP
CREATE INDEX IF NOT EXISTS idx_checklists_workspace_id ON public.checklists(workspace_id);
CREATE INDEX IF NOT EXISTS idx_checklists_sop_id ON public.checklists(sop_id);
CREATE INDEX IF NOT EXISTS idx_checklists_assigned_to ON public.checklists(assigned_to);

-- Checklist completions: lookup by checklist
CREATE INDEX IF NOT EXISTS idx_checklist_completions_checklist_id ON public.checklist_completions(checklist_id);
CREATE INDEX IF NOT EXISTS idx_checklist_completions_completed_by ON public.checklist_completions(completed_by);

-- Onboarding paths: filter by workspace
CREATE INDEX IF NOT EXISTS idx_onboarding_paths_workspace_id ON public.onboarding_paths(workspace_id);

-- Invites: lookup by workspace, email, and token
CREATE INDEX IF NOT EXISTS idx_invites_workspace_id ON public.invites(workspace_id);
CREATE INDEX IF NOT EXISTS idx_invites_email ON public.invites(email);
-- token already has a UNIQUE constraint which creates an implicit index

-- Users: lookup by workspace
CREATE INDEX IF NOT EXISTS idx_users_workspace_id ON public.users(workspace_id);


-- =============================================================================
-- 11. TRIGGERS
-- Automatic behaviors for data consistency
-- =============================================================================

-- Auto-update updated_at on the sops table whenever a row is modified
CREATE OR REPLACE FUNCTION public.update_sops_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sops_updated_at ON public.sops;
CREATE TRIGGER trigger_sops_updated_at
  BEFORE UPDATE ON public.sops
  FOR EACH ROW
  EXECUTE FUNCTION public.update_sops_updated_at();


-- Auto-create a version snapshot when an SOP's content is updated
CREATE OR REPLACE FUNCTION public.create_sop_version_on_update()
RETURNS trigger AS $$
BEGIN
  -- Only create a version if content actually changed
  IF OLD.content IS DISTINCT FROM NEW.content THEN
    INSERT INTO public.sop_versions (sop_id, version, content, changed_by, change_summary)
    VALUES (
      OLD.id,
      OLD.version,
      OLD.content,
      auth.uid(),
      'Auto-versioned on content update'
    );
    -- Increment the version number on the SOP
    NEW.version = OLD.version + 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_sop_version_on_update ON public.sops;
CREATE TRIGGER trigger_sop_version_on_update
  BEFORE UPDATE ON public.sops
  FOR EACH ROW
  EXECUTE FUNCTION public.create_sop_version_on_update();
