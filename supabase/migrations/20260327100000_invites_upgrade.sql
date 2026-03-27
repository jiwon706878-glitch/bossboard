-- =============================================================================
-- Upgrade invites table: add missing columns for full invite system
-- =============================================================================

-- Add business_id as alias for workspace_id (code uses business_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'invites' AND column_name = 'business_id'
  ) THEN
    ALTER TABLE public.invites ADD COLUMN business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE;
    -- Copy existing workspace_id values
    UPDATE public.invites SET business_id = workspace_id WHERE business_id IS NULL AND workspace_id IS NOT NULL;
  END IF;
END $$;

-- Add status column (pending, accepted, expired)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'invites' AND column_name = 'status'
  ) THEN
    ALTER TABLE public.invites ADD COLUMN status text DEFAULT 'pending';
    -- Migrate existing accepted boolean to status
    UPDATE public.invites SET status = 'accepted' WHERE accepted = true;
  END IF;
END $$;

-- Add created_by column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'invites' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE public.invites ADD COLUMN created_by uuid REFERENCES auth.users(id);
  END IF;
END $$;

-- Add expires_at column (default 7 days from now)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'invites' AND column_name = 'expires_at'
  ) THEN
    ALTER TABLE public.invites ADD COLUMN expires_at timestamptz DEFAULT (now() + interval '7 days');
  END IF;
END $$;

-- Make email nullable (for link-only invites)
ALTER TABLE public.invites ALTER COLUMN email DROP NOT NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_invites_business_id ON public.invites(business_id);
CREATE INDEX IF NOT EXISTS idx_invites_token ON public.invites(token);
CREATE INDEX IF NOT EXISTS idx_invites_status ON public.invites(status);

-- RLS: allow anyone to read invites by token (for acceptance flow)
DROP POLICY IF EXISTS "Anyone can read invite by token" ON public.invites;
CREATE POLICY "Anyone can read invite by token" ON public.invites FOR SELECT
  USING (true);

-- Keep existing write policies (business owner only) from the comprehensive RLS migration
