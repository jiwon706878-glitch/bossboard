-- Business members junction table
CREATE TABLE IF NOT EXISTS public.business_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  email TEXT,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(business_id, user_id)
);

ALTER TABLE public.business_members ENABLE ROW LEVEL SECURITY;

-- Members can see other members of their business
CREATE POLICY "Members can view team members"
  ON public.business_members FOR SELECT
  USING (
    business_id IN (
      SELECT business_id FROM public.business_members WHERE user_id = auth.uid()
    )
    OR
    business_id IN (
      SELECT id FROM public.businesses WHERE user_id = auth.uid()
    )
  );

-- Only business owner can insert/update/delete members
CREATE POLICY "Owner can manage members"
  ON public.business_members FOR ALL
  USING (
    business_id IN (
      SELECT id FROM public.businesses WHERE user_id = auth.uid()
    )
  );

-- Allow the invite accept API to insert (uses service role, but add policy for safety)
CREATE POLICY "Users can insert themselves"
  ON public.business_members FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_business_members_business ON public.business_members(business_id);
CREATE INDEX IF NOT EXISTS idx_business_members_user ON public.business_members(user_id);

-- Insert existing business owners as members
INSERT INTO public.business_members (business_id, user_id, role)
SELECT id, user_id, 'owner' FROM public.businesses
ON CONFLICT (business_id, user_id) DO NOTHING;
