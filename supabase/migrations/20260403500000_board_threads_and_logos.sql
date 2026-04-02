-- Threaded comments
ALTER TABLE public.board_comments ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.board_comments(id) ON DELETE CASCADE;

-- Business logo
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS logo_url TEXT;
