-- =============================================================================
-- Wiki file uploads: Supabase Storage bucket + SOP columns
-- =============================================================================

-- 1. Create storage bucket for wiki uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'wiki-uploads',
  'wiki-uploads',
  false,
  10485760, -- 10MB
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 2. Storage RLS policies
CREATE POLICY "Users can view own business files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'wiki-uploads'
  AND (storage.foldername(name))[1]::uuid IN (SELECT public.get_user_workspace_ids())
);

CREATE POLICY "Users can upload to own business folder"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'wiki-uploads'
  AND (storage.foldername(name))[1]::uuid IN (SELECT public.get_user_workspace_ids())
);

CREATE POLICY "Users can delete own business files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'wiki-uploads'
  AND (storage.foldername(name))[1]::uuid IN (SELECT public.get_user_workspace_ids())
);

-- 3. Add source file columns to sops table
ALTER TABLE public.sops ADD COLUMN IF NOT EXISTS source_file_url text;
ALTER TABLE public.sops ADD COLUMN IF NOT EXISTS source_file_name text;
