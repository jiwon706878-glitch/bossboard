-- Add is_admin flag to profiles if not exists
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- Set admin account
UPDATE profiles SET is_admin = true
WHERE id IN (SELECT id FROM auth.users WHERE email = 'jiwon706878@gmail.com');

-- Support threads table
CREATE TABLE IF NOT EXISTS public.support_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  subject TEXT NOT NULL,
  status TEXT CHECK (status IN ('open', 'in_progress', 'resolved')) DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Support messages table
CREATE TABLE IF NOT EXISTS public.support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID REFERENCES public.support_threads(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users(id) NOT NULL,
  sender_type TEXT CHECK (sender_type IN ('user', 'admin')) NOT NULL,
  content TEXT NOT NULL,
  attachments JSONB DEFAULT '[]'::jsonb,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_support_threads_status
  ON public.support_threads(status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_threads_user
  ON public.support_threads(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_messages_thread
  ON public.support_messages(thread_id, created_at);

-- RLS
ALTER TABLE public.support_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- Thread policies
CREATE POLICY "Users can view own threads" ON public.support_threads
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all threads" ON public.support_threads
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Users can create threads" ON public.support_threads
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own threads" ON public.support_threads
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can update all threads" ON public.support_threads
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Message policies
CREATE POLICY "View messages if thread owner or admin" ON public.support_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.support_threads t
      WHERE t.id = thread_id
      AND (t.user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true
      ))
    )
  );

CREATE POLICY "Insert messages if thread owner or admin" ON public.support_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND (
      EXISTS (
        SELECT 1 FROM public.support_threads t
        WHERE t.id = thread_id AND t.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true
      )
    )
  );

-- Enable realtime for live chat
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;
