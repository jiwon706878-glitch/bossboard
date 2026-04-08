-- Add salt column for password-protected share links
-- Existing links without salt will still work (backward compatible)
ALTER TABLE public.shared_links ADD COLUMN IF NOT EXISTS password_salt text;
