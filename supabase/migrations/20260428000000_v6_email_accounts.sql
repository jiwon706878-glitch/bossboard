-- V6 Group 2: email_accounts metadata table.
-- Per-user list of email connections. Auth credentials (OAuth tokens
-- or IMAP passwords) live in the OS keychain on the user's machine,
-- NOT in this table — Supabase only knows about the connection
-- existence + display info so multi-device sync can show a list.
--
-- Email content is NEVER stored cloud-side. Only metadata.

CREATE TABLE IF NOT EXISTS email_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('gmail', 'outlook', 'imap_smtp')),
  display_name TEXT,
  email TEXT NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  scopes TEXT[],
  imap_host TEXT,
  imap_port INT,
  smtp_host TEXT,
  smtp_port INT,
  use_tls BOOLEAN DEFAULT TRUE,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, email)
);

CREATE INDEX IF NOT EXISTS idx_email_accounts_user
  ON email_accounts(user_id) WHERE enabled;

ALTER TABLE email_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own email accounts" ON email_accounts;
CREATE POLICY "Users see own email accounts" ON email_accounts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role full access on email_accounts" ON email_accounts;
CREATE POLICY "Service role full access on email_accounts" ON email_accounts
  FOR ALL USING (auth.role() = 'service_role');
