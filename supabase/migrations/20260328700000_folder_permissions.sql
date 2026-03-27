-- =============================================================================
-- Folder-level access permissions
-- =============================================================================

-- Add permissions column: { "visible_to": ["all"] } or { "visible_to": ["uuid1", "uuid2"] }
ALTER TABLE public.folders ADD COLUMN IF NOT EXISTS permissions jsonb DEFAULT '{"visible_to": ["all"]}';
