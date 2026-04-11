-- ============================================================================
-- BB v2.0 Day 5 — Remove credit system backend
-- ----------------------------------------------------------------------------
-- Day 3 hid credits from marketing copy. Day 5 rips them out of the
-- backend entirely. BYOK is now the only path for AI features on
-- paid plans; Free plan users are blocked with an upgrade prompt.
--
-- The guide chatbot (/api/ai/chat) and auto-indexer (src/lib/ai/auto-index)
-- are the ONLY remaining BB-funded AI surfaces — they use Gemini Flash
-- via the router and don't read from any of the tables dropped here.
--
-- Safety: before dropping anything, we snapshot the data into
-- _archive_* tables so a rollback within 30 days is a simple
-- INSERT ... SELECT. The spec's columns (profiles.credits_balance,
-- credits_used_this_period, credits_reset_at) don't exist in this
-- codebase — credit state lives in the `credit_balances` table.
-- Dropping the TABLE is the equivalent of the spec's DROP COLUMN.
-- ============================================================================

-- 1. Archive tables — preserve everything we're about to drop
CREATE TABLE IF NOT EXISTS public._archive_credit_balances (
  business_id UUID,
  credits_monthly INT,
  credits_monthly_used INT,
  credits_purchased INT,
  credits_purchased_used INT,
  billing_cycle_start TIMESTAMPTZ,
  original_updated_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public._archive_credit_purchases (
  id UUID,
  business_id UUID,
  user_id UUID,
  pack_name TEXT,
  credits_amount INT,
  price_usd NUMERIC(10, 2),
  paddle_transaction_id TEXT,
  original_created_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public._archive_credit_abuse_log (
  id UUID,
  business_id UUID,
  user_id UUID,
  failure_count INT,
  blocked_until TIMESTAMPTZ,
  original_created_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Snapshot: copy rows into archive before dropping. Guarded by
-- information_schema so a re-run or a clean DB doesn't fail.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'credit_balances'
  ) THEN
    INSERT INTO public._archive_credit_balances (
      business_id,
      credits_monthly,
      credits_monthly_used,
      credits_purchased,
      credits_purchased_used,
      billing_cycle_start,
      original_updated_at
    )
    SELECT
      business_id,
      credits_monthly,
      credits_monthly_used,
      credits_purchased,
      credits_purchased_used,
      billing_cycle_start,
      updated_at
    FROM public.credit_balances;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'credit_purchases'
  ) THEN
    INSERT INTO public._archive_credit_purchases (
      id,
      business_id,
      user_id,
      pack_name,
      credits_amount,
      price_usd,
      paddle_transaction_id,
      original_created_at
    )
    SELECT
      id,
      business_id,
      user_id,
      pack_name,
      credits_amount,
      price_usd,
      paddle_transaction_id,
      created_at
    FROM public.credit_purchases;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'credit_abuse_log'
  ) THEN
    INSERT INTO public._archive_credit_abuse_log (
      id,
      business_id,
      user_id,
      failure_count,
      blocked_until,
      original_created_at
    )
    SELECT
      id,
      business_id,
      user_id,
      failure_count,
      blocked_until,
      created_at
    FROM public.credit_abuse_log;
  END IF;
END;
$$;

-- 3. Drop the old redeem_coupon_atomic — it inserts into credit_balances.
-- We replace it below with a discount-only version.
DROP FUNCTION IF EXISTS public.redeem_coupon_atomic(TEXT, UUID, UUID);

-- 4. Drop the credit tables. CASCADE removes policies + any dependent
-- views. The tables were only referenced by the deleted function,
-- the old lib/credits code path, and the admin dashboards — all
-- cleaned up in the same commit.
DROP TABLE IF EXISTS public.credit_balances CASCADE;
DROP TABLE IF EXISTS public.credit_purchases CASCADE;
DROP TABLE IF EXISTS public.credit_abuse_log CASCADE;

-- 5. Delete any existing credit-type coupons. The coupons table's
-- CHECK constraint will be tightened below to forbid new ones.
DELETE FROM public.coupons WHERE coupon_type = 'credits';

-- 6. Tighten the coupons CHECK constraint: only 'discount' allowed.
-- Postgres doesn't let you edit a CHECK constraint in place — drop
-- and recreate.
ALTER TABLE public.coupons
  DROP CONSTRAINT IF EXISTS coupons_coupon_type_check;
-- The original CHECK was a single anonymous table constraint mixing
-- coupon_type validation with the discount/credit payload. Drop all
-- anonymous check constraints and re-add a named one.
DO $$
DECLARE
  _con RECORD;
BEGIN
  FOR _con IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.coupons'::regclass
      AND contype = 'c'
  LOOP
    EXECUTE format('ALTER TABLE public.coupons DROP CONSTRAINT %I', _con.conname);
  END LOOP;
END;
$$;

ALTER TABLE public.coupons
  ADD CONSTRAINT coupons_discount_only CHECK (
    coupon_type = 'discount'
    AND discount_type IS NOT NULL
    AND discount_value IS NOT NULL
  );

-- The credit_amount column on coupons is now orphaned — keep it
-- (nullable) for archival purposes, but nothing reads it.

-- 7. Recreate redeem_coupon_atomic without the credit branch.
-- Same signature as before so src/lib/coupons.ts doesn't need a
-- schema change; the function just refuses to top up credits
-- because that code path is gone.
CREATE OR REPLACE FUNCTION public.redeem_coupon_atomic(
  p_code TEXT,
  p_user_id UUID,
  p_business_id UUID
)
RETURNS TABLE(
  success BOOLEAN,
  error_code TEXT,
  coupon_id UUID,
  coupon_type TEXT,
  discount_type TEXT,
  discount_value NUMERIC,
  credit_amount INT,
  paddle_discount_id TEXT,
  applies_to TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  c RECORD;
BEGIN
  -- Lock the coupon row to prevent concurrent over-redemption.
  SELECT * INTO c
  FROM public.coupons
  WHERE code = p_code
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'not_found'::TEXT, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::NUMERIC, NULL::INT, NULL::TEXT, NULL::TEXT[];
    RETURN;
  END IF;

  IF c.expires_at IS NOT NULL AND c.expires_at < NOW() THEN
    RETURN QUERY SELECT false, 'expired'::TEXT, c.id, NULL::TEXT, NULL::TEXT, NULL::NUMERIC, NULL::INT, NULL::TEXT, NULL::TEXT[];
    RETURN;
  END IF;

  IF c.current_uses >= c.max_uses THEN
    RETURN QUERY SELECT false, 'exhausted'::TEXT, c.id, NULL::TEXT, NULL::TEXT, NULL::NUMERIC, NULL::INT, NULL::TEXT, NULL::TEXT[];
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.coupon_redemptions
    WHERE coupon_id = c.id AND user_id = p_user_id
  ) THEN
    RETURN QUERY SELECT false, 'already_redeemed'::TEXT, c.id, NULL::TEXT, NULL::TEXT, NULL::NUMERIC, NULL::INT, NULL::TEXT, NULL::TEXT[];
    RETURN;
  END IF;

  UPDATE public.coupons
  SET current_uses = current_uses + 1
  WHERE id = c.id;

  INSERT INTO public.coupon_redemptions (coupon_id, user_id, business_id)
  VALUES (c.id, p_user_id, p_business_id);

  -- No credit-balance topup anymore: Day 5 removed the credit system.
  -- The function only supports discount coupons going forward.

  RETURN QUERY SELECT
    true,
    NULL::TEXT,
    c.id,
    c.coupon_type,
    c.discount_type,
    c.discount_value,
    c.credit_amount,
    c.paddle_discount_id,
    c.applies_to;
END;
$$;
