-- =============================================================================
-- Phase 2+3: Notifications, Recurring Checklists, Doc Types, Tags, Pins
-- =============================================================================

-- 1. Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  type text NOT NULL, -- checklist_due, sop_update, team_activity, onboarding
  title text NOT NULL,
  message text,
  link text,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE
  USING (user_id = auth.uid());
CREATE POLICY "System can insert notifications" ON public.notifications FOR INSERT
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(user_id, read);

-- 2. Recurrence columns on checklists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='checklists' AND column_name='recurrence_type') THEN
    ALTER TABLE public.checklists ADD COLUMN recurrence_type text DEFAULT 'none';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='checklists' AND column_name='recurrence_days') THEN
    ALTER TABLE public.checklists ADD COLUMN recurrence_days text[] DEFAULT '{}';
  END IF;
END $$;

-- 3. Doc type column on sops
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='sops' AND column_name='doc_type') THEN
    ALTER TABLE public.sops ADD COLUMN doc_type text DEFAULT 'sop';
  END IF;
END $$;

-- 4. Tags column on sops
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='sops' AND column_name='tags') THEN
    ALTER TABLE public.sops ADD COLUMN tags text[] DEFAULT '{}';
  END IF;
END $$;

-- 5. Pinned column on sops
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='sops' AND column_name='pinned') THEN
    ALTER TABLE public.sops ADD COLUMN pinned boolean DEFAULT false;
  END IF;
END $$;

-- 6. Enhance onboarding_paths with assignment and checklist support
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='onboarding_paths' AND column_name='assigned_to') THEN
    ALTER TABLE public.onboarding_paths ADD COLUMN assigned_to uuid REFERENCES auth.users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='onboarding_paths' AND column_name='checklist_ids') THEN
    ALTER TABLE public.onboarding_paths ADD COLUMN checklist_ids uuid[] DEFAULT '{}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='onboarding_paths' AND column_name='business_id') THEN
    ALTER TABLE public.onboarding_paths ADD COLUMN business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 7. Indexes
CREATE INDEX IF NOT EXISTS idx_sops_doc_type ON public.sops(doc_type);
CREATE INDEX IF NOT EXISTS idx_sops_pinned ON public.sops(pinned) WHERE pinned = true;
CREATE INDEX IF NOT EXISTS idx_sops_tags ON public.sops USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_checklists_recurrence ON public.checklists(recurrence_type);
