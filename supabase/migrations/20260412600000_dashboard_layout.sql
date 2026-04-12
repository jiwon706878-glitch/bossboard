-- BB v2.0 Day 13.6: Dashboard layout customization
-- Stores per-user widget positions/visibility for the dashboard grid.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS dashboard_layout JSONB NOT NULL DEFAULT '{}';
