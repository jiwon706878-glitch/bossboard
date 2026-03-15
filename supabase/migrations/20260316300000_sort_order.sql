-- Add sort_order to sops (folders already has it)
ALTER TABLE public.sops ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_sops_sort_order ON public.sops(sort_order);
