-- ============================================================================
-- BB v2.0 Day 12: Agent permissions JSONB column
-- ----------------------------------------------------------------------------
-- Stores per-agent action permissions. Default empty = no permissions.
-- Human users (account_type='human') are unaffected — permissions only
-- checked when request comes from an agent API key (Bearer bb_).
-- ============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS agent_permissions JSONB NOT NULL DEFAULT '{}';

-- Example shape:
-- {
--   "can_edit_wiki": true,
--   "can_post_board": false,
--   "can_send_dm": false,
--   "can_create_todos": true,
--   "allowed_folders": ["folder-uuid-1", "folder-uuid-2"]  -- empty = none, null = all
-- }

COMMENT ON COLUMN public.profiles.agent_permissions IS
  'Per-agent action permissions. Only enforced for account_type=agent API calls.';
