-- Store agent/key name directly in activity log for fast display
ALTER TABLE public.agent_activity_log ADD COLUMN IF NOT EXISTS key_name TEXT;
