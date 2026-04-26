-- V4 Group 3.4: Mac launch waitlist with 50% lifetime discount.
-- Public insert (no auth required) so the marketing /download page can
-- collect signups. Reads gated to service_role.

CREATE TABLE IF NOT EXISTS mac_waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  source TEXT,
  position INT GENERATED ALWAYS AS IDENTITY,
  signed_up_at TIMESTAMPTZ DEFAULT NOW(),
  notified_at TIMESTAMPTZ,
  discount_code TEXT,
  redeemed BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_mac_waitlist_position ON mac_waitlist(position);

ALTER TABLE mac_waitlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can sign up" ON mac_waitlist;
CREATE POLICY "Anyone can sign up" ON mac_waitlist
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on waitlist" ON mac_waitlist;
CREATE POLICY "Service role full access on waitlist" ON mac_waitlist
  FOR ALL USING (auth.role() = 'service_role');
