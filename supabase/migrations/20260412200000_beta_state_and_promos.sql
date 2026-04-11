-- ============================================================================
-- BB v2.0 beta state + per-plan promo split
-- ----------------------------------------------------------------------------
-- 1. New beta_state table holds the beta launch window (start/end dates).
--    The 14-day Pro trial banner reads end_date to compute "days left".
--    Auto-enrollment of signups into trials and the cron downgrade are
--    Day 4+ work — this migration just stores the dates.
--
-- 2. Splits the existing single "Launch Special — First 100 Users"
--    promotion into two per-plan promos (Starter / Pro), because BB v2.0
--    wants separate counters so the banner can show "Starter: 87 left,
--    Pro: 95 left". The existing promotions machinery
--    (increment_promotion_uses RPC + revalidateTag on admin mutations)
--    handles both rows automatically.
-- ============================================================================

-- 1. Beta state
CREATE TABLE IF NOT EXISTS public.beta_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_date TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '14 days'),
  pro_trial_days INT NOT NULL DEFAULT 14,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed a single row if empty. Idempotent: subsequent runs are no-ops.
INSERT INTO public.beta_state (is_active, start_date, end_date, pro_trial_days)
SELECT true, NOW(), NOW() + INTERVAL '14 days', 14
WHERE NOT EXISTS (SELECT 1 FROM public.beta_state);

ALTER TABLE public.beta_state ENABLE ROW LEVEL SECURITY;

-- Public read so the server-rendered banner can fetch it without
-- the admin service role key.
DROP POLICY IF EXISTS "Public read beta state" ON public.beta_state;
CREATE POLICY "Public read beta state"
  ON public.beta_state FOR SELECT
  USING (true);

-- Admin-only writes.
DROP POLICY IF EXISTS "Admins manage beta state" ON public.beta_state;
CREATE POLICY "Admins manage beta state"
  ON public.beta_state FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- 2. Per-plan promotion split
-- ----------------------------------------------------------------------------
-- Remove the original "Launch Special" single-promo row if it still
-- exists from the earlier seed, then insert two per-plan rows. We
-- preserve whatever `current_uses` count was on the original row by
-- splitting it between Starter and Pro — best-effort; the old migration
-- didn't track per-plan attribution so we just attribute all prior uses
-- to Starter (the more popular plan). On a fresh DB this is moot because
-- the count is 0.
DO $$
DECLARE
  _old_count INT := 0;
BEGIN
  SELECT COALESCE(MAX(current_uses), 0)
  INTO _old_count
  FROM public.promotions
  WHERE name = 'Launch Special — First 100 Users';

  DELETE FROM public.promotions
  WHERE name = 'Launch Special — First 100 Users';

  IF NOT EXISTS (
    SELECT 1 FROM public.promotions WHERE name = 'Beta Starter — First 100'
  ) THEN
    INSERT INTO public.promotions (
      name, description, discount_type, discount_value,
      applies_to, is_active, max_uses, current_uses,
      show_banner, banner_text
    ) VALUES (
      'Beta Starter — First 100',
      'First 100 Starter subscribers get 30% off forever.',
      'percent', 30,
      ARRAY['starter'],
      true, 100, LEAST(_old_count, 100),
      false,  -- banner is driven by the beta banner helper, not this flag
      'Starter: 30% lifetime discount for first 100 subscribers'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.promotions WHERE name = 'Beta Pro — First 100'
  ) THEN
    INSERT INTO public.promotions (
      name, description, discount_type, discount_value,
      applies_to, is_active, max_uses, current_uses,
      show_banner, banner_text
    ) VALUES (
      'Beta Pro — First 100',
      'First 100 Pro subscribers get 30% off forever.',
      'percent', 30,
      ARRAY['pro'],
      true, 100, 0,
      false,
      'Pro: 30% lifetime discount for first 100 subscribers'
    );
  END IF;
END;
$$;
