-- Add soft delete column to SOPs
ALTER TABLE public.sops ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

-- Index for efficient filtering of non-deleted SOPs
CREATE INDEX IF NOT EXISTS idx_sops_deleted_at ON public.sops (deleted_at) WHERE deleted_at IS NULL;
