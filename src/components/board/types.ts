// ─── Board shared types ─────────────────────────────────────────────────────

export interface Attachment {
  name: string;
  url: string;
  type: string;
  size: number;
}

export interface Post {
  id: string;
  user_id: string;
  type: string;
  title: string;
  content: string | null;
  is_pinned: boolean;
  created_at: string;
  author_name: string | null;
  comment_count: number;
  read_count: number;
  poll_options?: PollOption[];
  user_voted_option_id?: string | null;
  attachments?: Attachment[] | null;
  channel?: string;
}

export interface PollOption {
  id: string;
  option_text: string;
  vote_count: number;
}

export interface Comment {
  id: string;
  user_id: string;
  content: string;
  is_anonymous: boolean;
  created_at: string;
  author_name: string | null;
  parent_id: string | null;
}

export const TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  notice: { label: "Notice", color: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  discussion: { label: "Discussion", color: "bg-primary/10 text-primary" },
  poll: { label: "Poll", color: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
};
