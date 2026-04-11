-- ============================================================================
-- Agent Account System — BB v2.0 Day 1
-- ----------------------------------------------------------------------------
-- Agents are real database accounts that live alongside humans in the
-- profiles table. They share the same auth.users row shape (each agent
-- gets its own auth.users entry via auth.admin.createUser with a
-- synthetic email) so existing RLS patterns keyed on auth.uid() keep
-- working — an agent can authenticate against its own API key and the
-- lookup table maps the key back to the agent's profile id.
--
-- Important: the spec's original `wiki_pages` reference was swapped to
-- `sops`, which is the actual table in this codebase. The `profiles.id`
-- → `auth.users.id` FK means profiles cannot be inserted directly, so
-- the handle_new_user trigger is extended to populate agent fields from
-- raw_user_meta_data when the API route calls auth.admin.createUser.
-- ============================================================================

-- 1. New columns on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_type TEXT NOT NULL DEFAULT 'human'
    CHECK (account_type IN ('human', 'agent'));

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS parent_user_id UUID
    REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS agent_role TEXT;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS agent_status TEXT DEFAULT 'offline'
    CHECK (agent_status IN ('working', 'resting', 'standby', 'offline'));

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS current_task TEXT;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_heartbeat TIMESTAMPTZ;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferred_model TEXT;

-- References sops (the actual wiki table); original spec had wiki_pages
-- which does not exist in this codebase.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS agent_manual_page_id UUID
    REFERENCES public.sops(id) ON DELETE SET NULL;

-- 2. Constraint: agents must have a parent, humans must not
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'agent_must_have_parent'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT agent_must_have_parent CHECK (
        (account_type = 'human' AND parent_user_id IS NULL) OR
        (account_type = 'agent' AND parent_user_id IS NOT NULL)
      );
  END IF;
END;
$$;

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_account_type
  ON public.profiles(account_type);

CREATE INDEX IF NOT EXISTS idx_profiles_parent
  ON public.profiles(parent_user_id)
  WHERE account_type = 'agent';

CREATE INDEX IF NOT EXISTS idx_profiles_agent_status
  ON public.profiles(agent_status)
  WHERE account_type = 'agent';

-- 4. RLS policies — agent isolation
-- NB: the existing "Users can view own profile" policy (from 001_profiles.sql)
-- already allows humans to see their own profile. We add a second policy
-- that lets a human see profiles of their agents. Postgres ORs permissive
-- policies, so both remain in effect.
DROP POLICY IF EXISTS "Users can view their own agents" ON public.profiles;
CREATE POLICY "Users can view their own agents"
  ON public.profiles FOR SELECT
  USING (
    account_type = 'agent' AND parent_user_id = auth.uid()
  );

-- INSERT policy scoped to agent rows. Human profile inserts go through
-- the SECURITY DEFINER handle_new_user() trigger which bypasses RLS.
DROP POLICY IF EXISTS "Users can insert their own agents" ON public.profiles;
CREATE POLICY "Users can insert their own agents"
  ON public.profiles FOR INSERT
  WITH CHECK (
    account_type = 'agent' AND parent_user_id = auth.uid()
  );

-- UPDATE policy: humans update their own human profile OR their agents.
-- Replaces the existing "Users can update own profile" so both cases work.
-- The explicit WITH CHECK mirrors USING so Postgres re-evaluates the
-- post-image against the same invariants — this prevents a user from
-- flipping their own row to account_type='agent' (or transferring
-- ownership) through raw SQL even if it bypasses the API whitelist.
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile or agents" ON public.profiles;
CREATE POLICY "Users can update their own profile or agents"
  ON public.profiles FOR UPDATE
  USING (
    (account_type = 'human' AND id = auth.uid()) OR
    (account_type = 'agent' AND parent_user_id = auth.uid())
  )
  WITH CHECK (
    (account_type = 'human' AND id = auth.uid()) OR
    (account_type = 'agent' AND parent_user_id = auth.uid())
  );

-- DELETE policy scoped to agent rows only. Users cannot delete their
-- own human profile through RLS; that requires auth.admin.deleteUser.
DROP POLICY IF EXISTS "Users can delete their own agents" ON public.profiles;
CREATE POLICY "Users can delete their own agents"
  ON public.profiles FOR DELETE
  USING (
    account_type = 'agent' AND parent_user_id = auth.uid()
  );

-- 5. Extend handle_new_user trigger to populate agent metadata
-- When auth.admin.createUser is called with user_metadata.account_type='agent',
-- the trigger now reads parent_user_id, agent_role, and preferred_model
-- from raw_user_meta_data and populates the profile row atomically. For
-- human signups (no account_type metadata), behavior is unchanged.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  _account_type TEXT := COALESCE(NEW.raw_user_meta_data->>'account_type', 'human');
  _parent_user_id UUID;
BEGIN
  IF _account_type = 'agent' THEN
    _parent_user_id := (NEW.raw_user_meta_data->>'parent_user_id')::UUID;
    -- Refuse to create agent rows with a missing parent — keeps the
    -- CHECK constraint satisfied and surfaces misuse loudly.
    IF _parent_user_id IS NULL THEN
      RAISE EXCEPTION 'agent profile requires parent_user_id in user_metadata';
    END IF;

    INSERT INTO public.profiles (
      id,
      full_name,
      avatar_url,
      account_type,
      parent_user_id,
      agent_role,
      preferred_model,
      agent_status
    ) VALUES (
      NEW.id,
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'avatar_url',
      'agent',
      _parent_user_id,
      NEW.raw_user_meta_data->>'agent_role',
      NEW.raw_user_meta_data->>'preferred_model',
      'offline'
    );
  ELSE
    INSERT INTO public.profiles (id, full_name, avatar_url)
    VALUES (
      NEW.id,
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'avatar_url'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger already exists from 001_profiles.sql; CREATE OR REPLACE on the
-- function is sufficient. No need to re-create the trigger itself.

-- 6. api_keys.agent_id — so the heartbeat endpoint can resolve an
--    incoming API key back to the owning agent profile. Nullable for
--    backwards compat with existing human-owned keys.
ALTER TABLE public.api_keys
  ADD COLUMN IF NOT EXISTS agent_id UUID
    REFERENCES public.profiles(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_api_keys_agent ON public.api_keys(agent_id)
  WHERE agent_id IS NOT NULL;
