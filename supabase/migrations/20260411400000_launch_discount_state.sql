-- Launch discount state: tracks first 100 paid users for the "30% lifetime"
-- promotion. Auto-expires when paid_users_count reaches 100.

CREATE TABLE IF NOT EXISTS launch_discount_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paid_users_count INT NOT NULL DEFAULT 0,
  discount_expired BOOLEAN NOT NULL DEFAULT false,
  expired_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed a single row. Subsequent runs are no-ops.
INSERT INTO launch_discount_state (paid_users_count)
SELECT 0
WHERE NOT EXISTS (SELECT 1 FROM launch_discount_state);

-- Atomic increment. Returns the new count + expired flag.
-- Single-row UPDATE is atomic in Postgres, so concurrent webhook
-- calls cannot double-count or skip the 100-user boundary.
CREATE OR REPLACE FUNCTION increment_launch_discount_count()
RETURNS TABLE(count INT, expired BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _count INT;
  _expired BOOLEAN;
BEGIN
  UPDATE launch_discount_state
  SET
    paid_users_count = paid_users_count + 1,
    discount_expired = (paid_users_count + 1 >= 100),
    expired_at = CASE
      WHEN paid_users_count + 1 >= 100 AND expired_at IS NULL THEN NOW()
      ELSE expired_at
    END,
    updated_at = NOW()
  WHERE id = (SELECT id FROM launch_discount_state ORDER BY updated_at ASC LIMIT 1)
  RETURNING paid_users_count, discount_expired
  INTO _count, _expired;

  RETURN QUERY SELECT _count, _expired;
END;
$$;

-- Lock down direct access — reads go through service role only.
ALTER TABLE launch_discount_state ENABLE ROW LEVEL SECURITY;
