-- =============================================================================
-- Journal entries (업무일지) for daily work logs
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  content text NOT NULL,
  notes text, -- 특이사항
  manager_feedback text,
  manager_id uuid REFERENCES auth.users(id),
  feedback_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;

-- Team members can view all journal entries for their business
CREATE POLICY "Members can view journal entries" ON public.journal_entries FOR SELECT
  USING (business_id IN (SELECT public.get_user_workspace_ids()) OR user_id = auth.uid());

-- Users can create their own entries
CREATE POLICY "Users can create journal entries" ON public.journal_entries FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own entries; admins can update any (for feedback)
CREATE POLICY "Users and admins can update journal entries" ON public.journal_entries FOR UPDATE
  USING (user_id = auth.uid() OR public.user_is_workspace_admin(business_id));

-- Users can delete their own entries
CREATE POLICY "Users can delete own journal entries" ON public.journal_entries FOR DELETE
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_journal_entries_business ON public.journal_entries(business_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_user ON public.journal_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON public.journal_entries(entry_date DESC);
-- One entry per user per day
CREATE UNIQUE INDEX IF NOT EXISTS idx_journal_entries_unique_day ON public.journal_entries(business_id, user_id, entry_date);
