-- V4 Group 2.5: community translations submission table.
-- Users submit translations from the in-app /settings/translations
-- page; admin reviews and ships approved sets in the next release.

CREATE TABLE IF NOT EXISTS community_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  locale TEXT NOT NULL,
  translations JSONB NOT NULL,
  translated_count INT NOT NULL,
  total_count INT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewer_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_community_translations_locale
  ON community_translations(locale);
CREATE INDEX IF NOT EXISTS idx_community_translations_status
  ON community_translations(status);

ALTER TABLE community_translations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users insert their own submissions" ON community_translations;
CREATE POLICY "Users insert their own submissions" ON community_translations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users see their own submissions" ON community_translations;
CREATE POLICY "Users see their own submissions" ON community_translations
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role full access on translations" ON community_translations;
CREATE POLICY "Service role full access on translations" ON community_translations
  FOR ALL USING (auth.role() = 'service_role');
