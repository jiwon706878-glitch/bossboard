-- ============================================================================
-- BB v2.0 Day 10: Beta trial columns on profiles
-- ----------------------------------------------------------------------------
-- Adds columns to track per-user Pro trial state. During the beta window,
-- new signups get plan_id='pro' + trial_end_date = NOW()+14d. The downgrade
-- cron resets to original_plan_id when trial_end_date has passed and no
-- paddle_customer_id is present (no paid subscription).
-- ============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS trial_end_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_plan TEXT,
  ADD COLUMN IF NOT EXISTS original_plan_id TEXT;

-- Index for the downgrade cron: find expired trials efficiently
CREATE INDEX IF NOT EXISTS idx_profiles_trial_expiry
  ON public.profiles (trial_end_date)
  WHERE trial_end_date IS NOT NULL;
