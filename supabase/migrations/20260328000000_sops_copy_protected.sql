-- Add copy protection toggle to SOPs
ALTER TABLE public.sops ADD COLUMN IF NOT EXISTS copy_protected boolean DEFAULT false;
