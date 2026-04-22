-- ============================================================================
-- AI Meeting Room — meetings, participants, messages
-- ============================================================================

-- 1. Meetings table
CREATE TABLE IF NOT EXISTS public.meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  topic TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'in_progress', 'completed', 'approved', 'rejected')),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  conclusion TEXT,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

-- Owner (creator) can do everything
CREATE POLICY "Meeting creator manages own meetings"
  ON public.meetings FOR ALL
  USING (created_by = auth.uid());

-- Business members can view meetings in their business
CREATE POLICY "Business members can view meetings"
  ON public.meetings FOR SELECT
  USING (
    business_id IN (
      SELECT business_id FROM public.business_members WHERE user_id = auth.uid()
    )
    OR
    business_id IN (
      SELECT id FROM public.businesses WHERE user_id = auth.uid()
    )
  );

-- 2. Meeting participants
CREATE TABLE IF NOT EXISTS public.meeting_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'participant',
  UNIQUE(meeting_id, profile_id)
);

ALTER TABLE public.meeting_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business members can view meeting participants"
  ON public.meeting_participants FOR SELECT
  USING (
    meeting_id IN (
      SELECT m.id FROM public.meetings m
      WHERE m.business_id IN (
        SELECT business_id FROM public.business_members WHERE user_id = auth.uid()
      )
      OR m.business_id IN (
        SELECT id FROM public.businesses WHERE user_id = auth.uid()
      )
    )
  );

-- 3. Meeting messages
CREATE TABLE IF NOT EXISTS public.meeting_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES public.profiles(id),
  content TEXT NOT NULL,
  message_order INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.meeting_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business members can view meeting messages"
  ON public.meeting_messages FOR SELECT
  USING (
    meeting_id IN (
      SELECT m.id FROM public.meetings m
      WHERE m.business_id IN (
        SELECT business_id FROM public.business_members WHERE user_id = auth.uid()
      )
      OR m.business_id IN (
        SELECT id FROM public.businesses WHERE user_id = auth.uid()
      )
    )
  );

-- 4. Index for efficient message retrieval
CREATE INDEX IF NOT EXISTS idx_meeting_messages_order
  ON public.meeting_messages(meeting_id, message_order);

-- 5. Index for listing meetings by business
CREATE INDEX IF NOT EXISTS idx_meetings_business
  ON public.meetings(business_id, created_at DESC);
