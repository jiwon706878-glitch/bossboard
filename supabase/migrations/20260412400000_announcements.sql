-- ============================================================================
-- BB v2.0 Day 11: Announcements + user notification preferences (FIXED)
-- ============================================================================

-- 1. Announcements table
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('magazine', 'bugfix', 'feature', 'promo', 'general')),
  attachment_url TEXT,
  attachment_name TEXT,
  target_plan TEXT,
  target_user_id UUID REFERENCES auth.users(id),
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage announcements" ON public.announcements;
CREATE POLICY "Admins manage announcements"
  ON public.announcements FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

DROP POLICY IF EXISTS "Users read announcements" ON public.announcements;
CREATE POLICY "Users read announcements"
  ON public.announcements FOR SELECT
  USING (
    scheduled_at <= NOW()
    AND (expires_at IS NULL OR expires_at > NOW())
    AND (target_user_id IS NULL OR target_user_id = auth.uid())
  );

-- 2. Announcement read tracking
CREATE TABLE IF NOT EXISTS public.announcement_reads (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  announcement_id UUID REFERENCES public.announcements(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, announcement_id)
);

ALTER TABLE public.announcement_reads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own reads" ON public.announcement_reads;
CREATE POLICY "Users manage own reads"
  ON public.announcement_reads FOR ALL
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins view all reads" ON public.announcement_reads;
CREATE POLICY "Admins view all reads"
  ON public.announcement_reads FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- 3. User notification preferences
CREATE TABLE IF NOT EXISTS public.user_notification_prefs (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  magazine BOOLEAN NOT NULL DEFAULT true,
  bugfix BOOLEAN NOT NULL DEFAULT true,
  feature BOOLEAN NOT NULL DEFAULT true,
  promo BOOLEAN NOT NULL DEFAULT false,
  general BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_notification_prefs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own prefs" ON public.user_notification_prefs;
CREATE POLICY "Users manage own prefs"
  ON public.user_notification_prefs FOR ALL
  USING (user_id = auth.uid());

-- 4. Index (WHERE 절 제거, 전체 인덱스로)
CREATE INDEX IF NOT EXISTS idx_announcements_scheduled
  ON public.announcements (scheduled_at DESC);