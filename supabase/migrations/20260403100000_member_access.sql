-- =============================================================================
-- Fix member access: update helper functions + businesses RLS so that users
-- who joined via invite (business_members) can see dashboard data.
--
-- By updating get_user_workspace_ids() and user_is_workspace_admin(), every
-- existing RLS policy that calls them automatically gains member support.
-- =============================================================================

-- 1. Update get_user_workspace_ids to include business_members
CREATE OR REPLACE FUNCTION public.get_user_workspace_ids()
RETURNS SETOF uuid
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  -- Businesses the user owns
  RETURN QUERY SELECT id FROM public.businesses WHERE user_id = auth.uid();

  -- Businesses the user is a member of
  RETURN QUERY SELECT business_id FROM public.business_members WHERE user_id = auth.uid();
END;
$$;

-- 2. Update user_is_workspace_admin to check business_members for admin role
CREATE OR REPLACE FUNCTION public.user_is_workspace_admin(ws_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  -- Business owner = always admin
  IF EXISTS (SELECT 1 FROM public.businesses WHERE id = ws_id AND user_id = auth.uid()) THEN
    RETURN true;
  END IF;

  -- Check business_members for admin role
  IF EXISTS (
    SELECT 1 FROM public.business_members
    WHERE business_id = ws_id AND user_id = auth.uid() AND role IN ('admin', 'owner')
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- 3. Update businesses SELECT policy so members can read the business row
DROP POLICY IF EXISTS "Users can view own businesses" ON public.businesses;

CREATE POLICY "Users can view own businesses"
  ON public.businesses FOR SELECT
  USING (
    user_id = auth.uid()
    OR id IN (
      SELECT business_id FROM public.business_members WHERE user_id = auth.uid()
    )
  );
