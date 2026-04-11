-- ============================================================================
-- Promotions & Coupons
-- ----------------------------------------------------------------------------
-- Replaces the narrower launch_discount_state table with a generic
-- promotions/coupons system. Admin can create new promos + coupon codes
-- via /admin/promotions without touching code.
-- ============================================================================

-- 1. Promotions (global discounts)
CREATE TABLE IF NOT EXISTS public.promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percent', 'fixed')),
  discount_value NUMERIC(10, 2) NOT NULL CHECK (discount_value >= 0),
  applies_to TEXT[] NOT NULL DEFAULT ARRAY['starter', 'pro', 'business'],
  is_active BOOLEAN NOT NULL DEFAULT false,
  max_uses INT,
  current_uses INT NOT NULL DEFAULT 0,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  paddle_discount_id TEXT,
  show_banner BOOLEAN NOT NULL DEFAULT true,
  banner_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_promotions_active
  ON public.promotions(is_active)
  WHERE is_active = true;

ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

-- Public can see active promotions (for landing banner)
CREATE POLICY "Public read active promotions"
  ON public.promotions
  FOR SELECT
  USING (is_active = true);

-- Admins have full control
CREATE POLICY "Admins manage promotions"
  ON public.promotions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- 2. Coupons (individual codes)
CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  coupon_type TEXT NOT NULL CHECK (coupon_type IN ('discount', 'credits')),

  -- Discount-type fields
  discount_type TEXT CHECK (discount_type IN ('percent', 'fixed')),
  discount_value NUMERIC(10, 2),
  applies_to TEXT[],
  paddle_discount_id TEXT,

  -- Credit-type field
  credit_amount INT,

  max_uses INT NOT NULL DEFAULT 1 CHECK (max_uses > 0),
  current_uses INT NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Shape: discount coupons need discount_type+value; credit coupons need credit_amount
  CHECK (
    (coupon_type = 'discount' AND discount_type IS NOT NULL AND discount_value IS NOT NULL)
    OR
    (coupon_type = 'credits' AND credit_amount IS NOT NULL AND credit_amount > 0)
  )
);

CREATE INDEX IF NOT EXISTS idx_coupons_code ON public.coupons(code);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage coupons"
  ON public.coupons
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- 3. Redemptions
CREATE TABLE IF NOT EXISTS public.coupon_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- One redemption per user per coupon
  UNIQUE (coupon_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_user
  ON public.coupon_redemptions(user_id);

ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own redemptions"
  ON public.coupon_redemptions
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins view all redemptions"
  ON public.coupon_redemptions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- 4. Atomic promotion increment (called from Paddle webhook)
-- Single-row UPDATE ... RETURNING is atomic in Postgres; concurrent
-- calls cannot double-count or skip the max_uses boundary.
CREATE OR REPLACE FUNCTION public.increment_promotion_uses(promo_id UUID)
RETURNS TABLE(new_uses INT, max_reached BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _uses INT;
  _max INT;
BEGIN
  UPDATE public.promotions
  SET
    current_uses = current_uses + 1,
    updated_at = NOW(),
    is_active = CASE
      WHEN max_uses IS NOT NULL AND current_uses + 1 >= max_uses THEN false
      ELSE is_active
    END
  WHERE id = promo_id
  RETURNING current_uses, max_uses
  INTO _uses, _max;

  RETURN QUERY SELECT _uses, (_max IS NOT NULL AND _uses >= _max);
END;
$$;

-- 5. Atomic coupon redemption
-- Locks the coupon row, validates expiry/uses/prior-redemption,
-- increments use count, records redemption, and for credit coupons
-- adds to credit_balances.credits_purchased — all in one transaction.
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
  -- Lock the coupon row to prevent concurrent over-redemption
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

  -- For credit coupons, top up the balance immediately
  IF c.coupon_type = 'credits' AND p_business_id IS NOT NULL THEN
    INSERT INTO public.credit_balances (business_id, credits_purchased)
    VALUES (p_business_id, c.credit_amount)
    ON CONFLICT (business_id)
    DO UPDATE SET
      credits_purchased = public.credit_balances.credits_purchased + c.credit_amount,
      updated_at = NOW();
  END IF;

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

-- 6. Migrate the "First 100" promo from the old launch_discount_state,
--    then drop the old table + function. This migration is idempotent:
--    if launch_discount_state was never created, the DO block is a no-op.
DO $$
DECLARE
  _count INT := 0;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'launch_discount_state'
  ) THEN
    SELECT COALESCE(MAX(paid_users_count), 0)
    INTO _count
    FROM public.launch_discount_state;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.promotions WHERE name = 'Launch Special — First 100 Users'
  ) THEN
    INSERT INTO public.promotions (
      name,
      description,
      discount_type,
      discount_value,
      applies_to,
      is_active,
      max_uses,
      current_uses,
      show_banner,
      banner_text
    ) VALUES (
      'Launch Special — First 100 Users',
      'First 100 paying users get 30% off forever.',
      'percent',
      30,
      ARRAY['starter', 'pro', 'business'],
      (_count < 100),
      100,
      LEAST(_count, 100),
      true,
      'Launch Special · 30% lifetime discount on all paid plans'
    );
  END IF;
END;
$$;

DROP FUNCTION IF EXISTS public.increment_launch_discount_count();
DROP TABLE IF EXISTS public.launch_discount_state;

-- Keep updated_at fresh on promotion edits
CREATE OR REPLACE FUNCTION public.promotions_touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS promotions_touch_updated_at ON public.promotions;
CREATE TRIGGER promotions_touch_updated_at
  BEFORE UPDATE ON public.promotions
  FOR EACH ROW
  EXECUTE FUNCTION public.promotions_touch_updated_at();
