-- ============================================================================
-- BB v2.0 Day 6 — Direct Messages
-- ----------------------------------------------------------------------------
-- 1:1 and group DMs between humans AND AI agents. Agents are real
-- profile rows (BB v2.0 Day 1) so dm_participants.profile_id covers
-- both naturally — no second table needed.
--
-- RLS uses a SECURITY DEFINER helper to break the recursive
-- "users can see participants of conversations they participate in"
-- policy chain. Doing it inline as a subquery causes Postgres to
-- recurse infinitely (the subquery on dm_participants is itself
-- gated by the same policy). The helper bypasses RLS internally
-- and returns a simple boolean.
-- ============================================================================

-- 1. Conversations
CREATE TABLE IF NOT EXISTS public.dm_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_group BOOLEAN NOT NULL DEFAULT false,
  title TEXT,                    -- only meaningful for is_group = true
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dm_conversations_business
  ON public.dm_conversations(business_id);
CREATE INDEX IF NOT EXISTS idx_dm_conversations_last_message
  ON public.dm_conversations(last_message_at DESC);

-- 2. Participants
CREATE TABLE IF NOT EXISTS public.dm_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.dm_conversations(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (conversation_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_dm_participants_profile
  ON public.dm_participants(profile_id);
CREATE INDEX IF NOT EXISTS idx_dm_participants_conversation
  ON public.dm_participants(conversation_id);

-- 3. Messages
CREATE TABLE IF NOT EXISTS public.dm_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.dm_conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  reply_to_id UUID REFERENCES public.dm_messages(id) ON DELETE SET NULL,
  edited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dm_messages_conversation
  ON public.dm_messages(conversation_id, created_at DESC);

-- 4. Helper: is the calling user a participant in a given conversation?
-- SECURITY DEFINER bypasses RLS so it can read dm_participants without
-- recursing through the participants policy.
CREATE OR REPLACE FUNCTION public.user_is_dm_participant(_conv UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.dm_participants
    WHERE conversation_id = _conv
      AND (
        profile_id = auth.uid()
        OR profile_id IN (
          SELECT id FROM public.profiles
          WHERE parent_user_id = auth.uid()
        )
      )
  );
END;
$$;

-- 5. RLS
ALTER TABLE public.dm_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dm_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dm_messages ENABLE ROW LEVEL SECURITY;

-- conversations: visible if you're a participant
DROP POLICY IF EXISTS "dm_conv_select" ON public.dm_conversations;
CREATE POLICY "dm_conv_select" ON public.dm_conversations
  FOR SELECT
  USING (public.user_is_dm_participant(id));

-- conversations: any authenticated user in their own business can create
DROP POLICY IF EXISTS "dm_conv_insert" ON public.dm_conversations;
CREATE POLICY "dm_conv_insert" ON public.dm_conversations
  FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND business_id IN (SELECT public.get_user_workspace_ids())
  );

-- conversations: only the creator can update title etc.
DROP POLICY IF EXISTS "dm_conv_update" ON public.dm_conversations;
CREATE POLICY "dm_conv_update" ON public.dm_conversations
  FOR UPDATE
  USING (created_by = auth.uid());

-- participants: visible if you're a participant in the same conversation
DROP POLICY IF EXISTS "dm_part_select" ON public.dm_participants;
CREATE POLICY "dm_part_select" ON public.dm_participants
  FOR SELECT
  USING (public.user_is_dm_participant(conversation_id));

-- participants: a user can add themselves OR any agent they own
DROP POLICY IF EXISTS "dm_part_insert" ON public.dm_participants;
CREATE POLICY "dm_part_insert" ON public.dm_participants
  FOR INSERT
  WITH CHECK (
    profile_id = auth.uid()
    OR profile_id IN (
      SELECT id FROM public.profiles WHERE parent_user_id = auth.uid()
    )
    OR public.user_is_dm_participant(conversation_id)
  );

-- participants: a user can update their own last_read_at
DROP POLICY IF EXISTS "dm_part_update" ON public.dm_participants;
CREATE POLICY "dm_part_update" ON public.dm_participants
  FOR UPDATE
  USING (
    profile_id = auth.uid()
    OR profile_id IN (
      SELECT id FROM public.profiles WHERE parent_user_id = auth.uid()
    )
  );

-- messages: visible if you're a participant
DROP POLICY IF EXISTS "dm_msg_select" ON public.dm_messages;
CREATE POLICY "dm_msg_select" ON public.dm_messages
  FOR SELECT
  USING (public.user_is_dm_participant(conversation_id));

-- messages: caller can send as themselves OR as any agent they own
DROP POLICY IF EXISTS "dm_msg_insert" ON public.dm_messages;
CREATE POLICY "dm_msg_insert" ON public.dm_messages
  FOR INSERT
  WITH CHECK (
    public.user_is_dm_participant(conversation_id)
    AND (
      sender_id = auth.uid()
      OR sender_id IN (
        SELECT id FROM public.profiles WHERE parent_user_id = auth.uid()
      )
    )
  );

-- messages: only the sender can edit (mark via edited_at column)
DROP POLICY IF EXISTS "dm_msg_update" ON public.dm_messages;
CREATE POLICY "dm_msg_update" ON public.dm_messages
  FOR UPDATE
  USING (
    sender_id = auth.uid()
    OR sender_id IN (
      SELECT id FROM public.profiles WHERE parent_user_id = auth.uid()
    )
  );

-- 6. Bump conversation.last_message_at on every new message
CREATE OR REPLACE FUNCTION public.dm_messages_touch_conversation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.dm_conversations
  SET last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS dm_messages_touch_conversation ON public.dm_messages;
CREATE TRIGGER dm_messages_touch_conversation
  AFTER INSERT ON public.dm_messages
  FOR EACH ROW EXECUTE FUNCTION public.dm_messages_touch_conversation();
