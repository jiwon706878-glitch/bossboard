-- V4 Group 1.7: first-100 lifetime discount tracker + auto-assign RPC.
-- Wired into the Paddle webhook on subscription.created (deferred — see
-- LAUNCH-CHECKLIST). Idempotent — safe to re-run.

CREATE TABLE IF NOT EXISTS discount_codes (
  code TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  discount_pct INT NOT NULL,
  is_lifetime BOOLEAN DEFAULT FALSE,
  redeemed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  redeemed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS first_hundred_counter (
  id INT PRIMARY KEY DEFAULT 1,
  count INT DEFAULT 0,
  CHECK (id = 1)
);

INSERT INTO first_hundred_counter (id, count) VALUES (1, 0)
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION assign_first_hundred_discount(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_count INT;
  v_code TEXT;
BEGIN
  UPDATE first_hundred_counter
  SET count = count + 1
  WHERE id = 1
  RETURNING count INTO v_count;

  IF v_count > 100 THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'first_hundred_full');
  END IF;

  v_code := 'BETA100-' || UPPER(SUBSTR(MD5(p_user_id::TEXT), 1, 8));

  INSERT INTO discount_codes (code, user_id, discount_pct, is_lifetime)
  VALUES (v_code, p_user_id, 30, TRUE)
  ON CONFLICT (code) DO NOTHING;

  RETURN jsonb_build_object(
    'eligible', true,
    'code', v_code,
    'discount_pct', 30,
    'is_lifetime', true,
    'position', v_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER TABLE discount_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE first_hundred_counter ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own discount codes" ON discount_codes;
CREATE POLICY "Users see own discount codes" ON discount_codes
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role full access on discounts" ON discount_codes;
CREATE POLICY "Service role full access on discounts" ON discount_codes
  FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role reads counter" ON first_hundred_counter;
CREATE POLICY "Service role reads counter" ON first_hundred_counter
  FOR ALL USING (auth.role() = 'service_role');
