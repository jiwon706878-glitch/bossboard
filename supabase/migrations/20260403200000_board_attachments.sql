-- Add attachments column to board posts
-- Format: [{name, url, type, size}]
ALTER TABLE public.board_posts ADD COLUMN IF NOT EXISTS attachments JSONB;

-- NOTE: Also create a Supabase Storage bucket named "attachments" (public, 50MB limit)
-- via Supabase Dashboard → Storage → New Bucket
