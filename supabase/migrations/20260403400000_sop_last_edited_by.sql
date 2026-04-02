-- Track who last edited a document
ALTER TABLE public.sops ADD COLUMN IF NOT EXISTS last_edited_by_name TEXT;
