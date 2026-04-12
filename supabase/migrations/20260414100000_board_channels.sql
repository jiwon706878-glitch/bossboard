-- ============================================================================
-- BB v2.0 Day 7 — Board channels
-- ----------------------------------------------------------------------------
-- Spec correction: there is no `boards` table in this codebase. The
-- Day 0 schema models the bulletin board as a single feed per business
-- (board_posts.business_id), not as a `boards` entity that posts FK to.
-- The original spec's `ALTER TABLE boards ADD COLUMN channel_type` and
-- the `board_members(board_id ...)` table can't be applied — there's
-- no row to FK to.
--
-- Pragmatic equivalent: add a `channel` column directly on board_posts.
-- Channels are workspace-public (everyone in the business sees every
-- channel via the existing board_posts RLS), so the spec's
-- "private channels with membership" feature is intentionally NOT
-- shipped here — it would require introducing a true boards entity
-- + migrating every existing post + rewriting the existing board UI.
-- That's a much larger refactor than Day 7 should attempt.
--
-- The four allowed channels match the spec:
--   general        — default catch-all, all existing posts backfilled here
--   team           — internal team-only discussion (still workspace-public
--                    for now; private gating is future work)
--   agent-activity — feed for agent heartbeat / activity log posts
--   announcements  — pinned-style company-wide updates
-- ============================================================================

-- 1. New column with a CHECK constraint enforcing the allowed values
ALTER TABLE public.board_posts
  ADD COLUMN IF NOT EXISTS channel TEXT NOT NULL DEFAULT 'general';

-- Idempotent constraint add — wrapped in DO block so re-running the
-- migration doesn't error on the existing constraint name.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'board_posts_channel_check'
  ) THEN
    ALTER TABLE public.board_posts
      ADD CONSTRAINT board_posts_channel_check
      CHECK (channel IN ('general', 'team', 'agent-activity', 'announcements'));
  END IF;
END;
$$;

-- 2. Index for channel filtering. Composite with business_id so the
-- "show all posts in #general for this business" query is a single
-- index lookup.
CREATE INDEX IF NOT EXISTS idx_board_posts_business_channel
  ON public.board_posts(business_id, channel, created_at DESC);

-- 3. Backfill: anything created before Day 7 lands in #general by
-- default (already handled by the column DEFAULT, but be explicit
-- for clarity in case the column is added without the default by a
-- future tool).
UPDATE public.board_posts
SET channel = 'general'
WHERE channel IS NULL;
