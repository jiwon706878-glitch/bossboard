-- =============================================================================
-- Bulletin board (게시판): posts, comments, polls, read tracking
-- =============================================================================

-- 1. Posts
CREATE TABLE IF NOT EXISTS public.board_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL DEFAULT 'discussion', -- notice, discussion, poll
  title text NOT NULL,
  content text,
  is_pinned boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.board_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view posts" ON public.board_posts FOR SELECT
  USING (business_id IN (SELECT public.get_user_workspace_ids()));
CREATE POLICY "Members can create posts" ON public.board_posts FOR INSERT
  WITH CHECK (business_id IN (SELECT public.get_user_workspace_ids()) AND user_id = auth.uid());
CREATE POLICY "Author or admin can update posts" ON public.board_posts FOR UPDATE
  USING (user_id = auth.uid() OR public.user_is_workspace_admin(business_id));
CREATE POLICY "Author or admin can delete posts" ON public.board_posts FOR DELETE
  USING (user_id = auth.uid() OR public.user_is_workspace_admin(business_id));

CREATE INDEX IF NOT EXISTS idx_board_posts_business ON public.board_posts(business_id);
CREATE INDEX IF NOT EXISTS idx_board_posts_created ON public.board_posts(created_at DESC);

-- 2. Comments
CREATE TABLE IF NOT EXISTS public.board_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES public.board_posts(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  is_anonymous boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.board_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view comments" ON public.board_comments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.board_posts
    WHERE board_posts.id = board_comments.post_id
    AND board_posts.business_id IN (SELECT public.get_user_workspace_ids())
  ));
CREATE POLICY "Members can create comments" ON public.board_comments FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Author can delete own comments" ON public.board_comments FOR DELETE
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_board_comments_post ON public.board_comments(post_id);

-- 3. Poll options
CREATE TABLE IF NOT EXISTS public.poll_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES public.board_posts(id) ON DELETE CASCADE NOT NULL,
  option_text text NOT NULL,
  sort_order integer DEFAULT 0
);

ALTER TABLE public.poll_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view poll options" ON public.poll_options FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.board_posts
    WHERE board_posts.id = poll_options.post_id
    AND board_posts.business_id IN (SELECT public.get_user_workspace_ids())
  ));
CREATE POLICY "Members can create poll options" ON public.poll_options FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.board_posts
    WHERE board_posts.id = poll_options.post_id
    AND board_posts.user_id = auth.uid()
  ));

-- 4. Poll votes (one per user per poll)
CREATE TABLE IF NOT EXISTS public.poll_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  option_id uuid REFERENCES public.poll_options(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view votes" ON public.poll_votes FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.poll_options
    JOIN public.board_posts ON board_posts.id = poll_options.post_id
    WHERE poll_options.id = poll_votes.option_id
    AND board_posts.business_id IN (SELECT public.get_user_workspace_ids())
  ));
CREATE POLICY "Members can vote" ON public.poll_votes FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Unique: one vote per user per poll (enforced at option's post level)
CREATE UNIQUE INDEX IF NOT EXISTS idx_poll_votes_unique
  ON public.poll_votes(user_id, option_id);

CREATE INDEX IF NOT EXISTS idx_poll_votes_option ON public.poll_votes(option_id);

-- 5. Post read tracking
CREATE TABLE IF NOT EXISTS public.board_post_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES public.board_posts(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  read_at timestamptz DEFAULT now()
);

ALTER TABLE public.board_post_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view reads" ON public.board_post_reads FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.board_posts
    WHERE board_posts.id = board_post_reads.post_id
    AND board_posts.business_id IN (SELECT public.get_user_workspace_ids())
  ));
CREATE POLICY "Users can mark as read" ON public.board_post_reads FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE UNIQUE INDEX IF NOT EXISTS idx_board_post_reads_unique ON public.board_post_reads(post_id, user_id);
