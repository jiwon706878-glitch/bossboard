-- Ensure sort_order exists on both tables with indexes
ALTER TABLE public.sops ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;
ALTER TABLE public.folders ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_sops_sort_order ON public.sops(sort_order);
CREATE INDEX IF NOT EXISTS idx_folders_sort_order ON public.folders(sort_order);

-- Ensure sops.pinned column exists
ALTER TABLE public.sops ADD COLUMN IF NOT EXISTS pinned boolean DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_sops_pinned ON public.sops(pinned);
