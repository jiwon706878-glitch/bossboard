"use client";

import { useEffect, useState, useCallback } from "react";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { useBusinessStore } from "@/hooks/use-business";
import { useRoleStore } from "@/hooks/use-role";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Loader2, Plus, Send, Megaphone, MessageCircle, BarChart3,
  Eye, Trash2, X, ChevronDown, ChevronUp,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Post {
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
}

interface PollOption {
  id: string;
  option_text: string;
  vote_count: number;
}

interface Comment {
  id: string;
  user_id: string;
  content: string;
  is_anonymous: boolean;
  created_at: string;
  author_name: string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  notice: { label: "Notice", color: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  discussion: { label: "Discussion", color: "bg-primary/10 text-primary" },
  poll: { label: "Poll", color: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function BoardPage() {
  const supabase = createClient();
  const currentBusiness = useBusinessStore((s) => s.currentBusiness);
  const { isAdmin } = useRoleStore();

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Create form
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState("discussion");
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formPinned, setFormPinned] = useState(false);
  const [pollInputs, setPollInputs] = useState(["", ""]);
  const [submitting, setSubmitting] = useState(false);

  // Expanded post (for comments)
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentAnon, setCommentAnon] = useState(false);
  const [commentSubmitting, setCommentSubmitting] = useState(false);

  // ─── Load posts ──────────────────────────────────────────────────────────

  const loadPosts = useCallback(async () => {
    if (!currentBusiness?.id) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (user) setCurrentUserId(user.id);

    const { data: postsData } = await supabase
      .from("board_posts")
      .select("id, user_id, type, title, content, is_pinned, created_at")
      .eq("business_id", currentBusiness.id)
      .order("created_at", { ascending: false });

    if (!postsData || postsData.length === 0) {
      setPosts([]);
      setLoading(false);
      return;
    }

    const postIds = postsData.map((p) => p.id);

    // Parallel fetches
    const [
      { data: commentCounts },
      { data: readCounts },
      { data: profiles },
      { data: pollOptions },
      { data: pollVotes },
    ] = await Promise.all([
      supabase.from("board_comments").select("post_id").in("post_id", postIds),
      supabase.from("board_post_reads").select("post_id").in("post_id", postIds),
      supabase.from("profiles").select("id, full_name").in("id", [...new Set(postsData.map((p) => p.user_id))]),
      supabase.from("poll_options").select("id, post_id, option_text, sort_order").in("post_id", postIds).order("sort_order"),
      user ? supabase.from("poll_votes").select("option_id, user_id").eq("user_id", user.id) : Promise.resolve({ data: [] }),
    ]);

    // Count votes per option
    const optionIds = (pollOptions ?? []).map((o) => o.id);
    const { data: allVotes } = optionIds.length > 0
      ? await supabase.from("poll_votes").select("option_id").in("option_id", optionIds)
      : { data: [] };

    const voteCounts = new Map<string, number>();
    for (const v of allVotes ?? []) {
      voteCounts.set(v.option_id, (voteCounts.get(v.option_id) ?? 0) + 1);
    }

    const nameMap = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));
    const commentCountMap = new Map<string, number>();
    for (const c of commentCounts ?? []) {
      commentCountMap.set(c.post_id, (commentCountMap.get(c.post_id) ?? 0) + 1);
    }
    const readCountMap = new Map<string, number>();
    for (const r of readCounts ?? []) {
      readCountMap.set(r.post_id, (readCountMap.get(r.post_id) ?? 0) + 1);
    }

    const userVotedOptions = new Set((pollVotes ?? []).map((v) => v.option_id));

    const enriched: Post[] = postsData.map((p) => {
      const opts = (pollOptions ?? [])
        .filter((o) => o.post_id === p.id)
        .map((o) => ({
          id: o.id,
          option_text: o.option_text,
          vote_count: voteCounts.get(o.id) ?? 0,
        }));

      const votedOpt = opts.find((o) => userVotedOptions.has(o.id));

      return {
        id: p.id,
        user_id: p.user_id,
        type: p.type,
        title: p.title,
        content: p.content,
        is_pinned: p.is_pinned,
        created_at: p.created_at,
        author_name: nameMap.get(p.user_id) ?? null,
        comment_count: commentCountMap.get(p.id) ?? 0,
        read_count: readCountMap.get(p.id) ?? 0,
        poll_options: opts.length > 0 ? opts : undefined,
        user_voted_option_id: votedOpt?.id ?? null,
      };
    });

    // Sort: pinned first, then by date
    enriched.sort((a, b) => {
      if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    setPosts(enriched);
    setLoading(false);

    // Mark notices as read
    if (user) {
      const notices = enriched.filter((p) => p.type === "notice");
      for (const n of notices) {
        supabase.from("board_post_reads").upsert(
          { post_id: n.id, user_id: user.id },
          { onConflict: "post_id,user_id" }
        ).then(() => {});
      }
    }
  }, [currentBusiness?.id, supabase]);

  useEffect(() => { loadPosts(); }, [loadPosts]);

  // ─── Create post ─────────────────────────────────────────────────────────

  async function handleCreatePost(e: React.FormEvent) {
    e.preventDefault();
    if (!formTitle.trim() || !currentBusiness?.id) return;
    setSubmitting(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("Not logged in"); setSubmitting(false); return; }

    const { data: post, error } = await supabase
      .from("board_posts")
      .insert({
        business_id: currentBusiness.id,
        user_id: user.id,
        type: formType,
        title: formTitle.trim(),
        content: formContent.trim() || null,
        is_pinned: formPinned && formType === "notice",
      })
      .select("id")
      .single();

    if (error) {
      toast.error(error.message);
      setSubmitting(false);
      return;
    }

    // Create poll options if poll type
    if (formType === "poll" && post) {
      const validOptions = pollInputs.filter((o) => o.trim());
      if (validOptions.length >= 2) {
        await supabase.from("poll_options").insert(
          validOptions.map((text, i) => ({
            post_id: post.id,
            option_text: text.trim(),
            sort_order: i,
          }))
        );
      }
    }

    toast.success("Post created");
    setShowForm(false);
    setFormTitle("");
    setFormContent("");
    setFormType("discussion");
    setFormPinned(false);
    setPollInputs(["", ""]);
    setSubmitting(false);
    loadPosts();
  }

  // ─── Delete post ─────────────────────────────────────────────────────────

  async function handleDeletePost(postId: string) {
    const { error } = await supabase.from("board_posts").delete().eq("id", postId);
    if (error) toast.error(error.message);
    else { toast.success("Post deleted"); loadPosts(); }
  }

  // ─── Poll vote ───────────────────────────────────────────────────────────

  async function handleVote(optionId: string) {
    const { error } = await supabase.from("poll_votes").insert({
      option_id: optionId,
      user_id: currentUserId,
    });
    if (error) {
      if (error.code === "23505") toast.error("You already voted");
      else toast.error(error.message);
      return;
    }
    loadPosts();
  }

  // ─── Comments ────────────────────────────────────────────────────────────

  async function loadComments(postId: string) {
    setCommentsLoading(true);
    const { data } = await supabase
      .from("board_comments")
      .select("id, user_id, content, is_anonymous, created_at")
      .eq("post_id", postId)
      .order("created_at");

    if (data && data.length > 0) {
      const userIds = [...new Set(data.filter((c) => !c.is_anonymous).map((c) => c.user_id))];
      const { data: profiles } = userIds.length > 0
        ? await supabase.from("profiles").select("id, full_name").in("id", userIds)
        : { data: [] };
      const nameMap = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

      setComments(data.map((c) => ({
        ...c,
        author_name: c.is_anonymous ? null : nameMap.get(c.user_id) ?? null,
      })));
    } else {
      setComments([]);
    }
    setCommentsLoading(false);
  }

  function toggleExpand(postId: string) {
    if (expandedId === postId) {
      setExpandedId(null);
      setComments([]);
    } else {
      setExpandedId(postId);
      loadComments(postId);
    }
    setCommentText("");
    setCommentAnon(false);
  }

  async function handleAddComment(postId: string) {
    if (!commentText.trim()) return;
    setCommentSubmitting(true);

    const { error } = await supabase.from("board_comments").insert({
      post_id: postId,
      user_id: currentUserId,
      content: commentText.trim(),
      is_anonymous: commentAnon,
    });

    if (error) toast.error(error.message);
    else {
      setCommentText("");
      setCommentAnon(false);
      loadComments(postId);
      // Update comment count locally
      setPosts((prev) => prev.map((p) =>
        p.id === postId ? { ...p, comment_count: p.comment_count + 1 } : p
      ));
    }
    setCommentSubmitting(false);
  }

  async function handleDeleteComment(commentId: string, postId: string) {
    await supabase.from("board_comments").delete().eq("id", commentId);
    loadComments(postId);
    setPosts((prev) => prev.map((p) =>
      p.id === postId ? { ...p, comment_count: Math.max(0, p.comment_count - 1) } : p
    ));
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Board</h1>
          <p className="text-muted-foreground">Team bulletin board</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? <X className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
          {showForm ? "Cancel" : "New Post"}
        </Button>
      </div>

      {/* Create form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">New Post</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreatePost} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={formType} onValueChange={setFormType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="discussion">Discussion</SelectItem>
                      <SelectItem value="notice">Notice</SelectItem>
                      <SelectItem value="poll">Poll</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formType === "notice" && (
                  <div className="flex items-end gap-2 pb-1">
                    <Switch id="pin-notice" checked={formPinned} onCheckedChange={setFormPinned} />
                    <Label htmlFor="pin-notice" className="cursor-pointer text-sm">Pin to top</Label>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="Post title" required />
              </div>
              <div className="space-y-2">
                <Label>Content</Label>
                <Textarea value={formContent} onChange={(e) => setFormContent(e.target.value)} placeholder="Write your post..." rows={4} />
              </div>

              {/* Poll options */}
              {formType === "poll" && (
                <div className="space-y-2">
                  <Label>Poll Options (2-5)</Label>
                  {pollInputs.map((opt, i) => (
                    <div key={i} className="flex gap-2">
                      <Input
                        value={opt}
                        onChange={(e) => {
                          const next = [...pollInputs];
                          next[i] = e.target.value;
                          setPollInputs(next);
                        }}
                        placeholder={`Option ${i + 1}`}
                      />
                      {pollInputs.length > 2 && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => setPollInputs(pollInputs.filter((_, j) => j !== i))}>
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  {pollInputs.length < 5 && (
                    <Button type="button" variant="outline" size="sm" onClick={() => setPollInputs([...pollInputs, ""])}>
                      Add Option
                    </Button>
                  )}
                </div>
              )}

              <Button type="submit" disabled={submitting || !formTitle.trim()}>
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                {submitting ? "Posting..." : "Post"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Posts list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 animate-pulse rounded-md border bg-muted/40" />)}
        </div>
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-md border bg-card py-12 text-center">
          <MessageCircle className="mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No posts yet. Start a conversation!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => {
            const typeConf = TYPE_CONFIG[post.type] || TYPE_CONFIG.discussion;
            const isExpanded = expandedId === post.id;
            const canDelete = post.user_id === currentUserId || isAdmin();
            const hasVoted = !!post.user_voted_option_id;
            const totalVotes = post.poll_options?.reduce((s, o) => s + o.vote_count, 0) ?? 0;

            return (
              <Card key={post.id} className="border bg-card">
                <CardContent className="py-4 space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {post.is_pinned && <Megaphone className="h-4 w-4 text-amber-500 shrink-0" />}
                        <Badge variant="secondary" className={cn("text-[10px] px-1.5 py-0.5", typeConf.color)}>
                          {typeConf.label}
                        </Badge>
                        <span className="font-medium text-sm">{post.title}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{post.author_name || "Unknown"}</span>
                        <span>{format(new Date(post.created_at), "MMM d, h:mm a")}</span>
                        {post.type === "notice" && post.read_count > 0 && (
                          <span className="flex items-center gap-0.5"><Eye className="h-3 w-3" />{post.read_count}</span>
                        )}
                      </div>
                    </div>
                    {canDelete && (
                      <Button variant="ghost" size="sm" className="shrink-0 text-muted-foreground hover:text-destructive" onClick={() => handleDeletePost(post.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>

                  {/* Content */}
                  {post.content && (
                    <p className="text-sm whitespace-pre-wrap">{post.content}</p>
                  )}

                  {/* Poll */}
                  {post.type === "poll" && post.poll_options && (
                    <div className="space-y-2">
                      {post.poll_options.map((opt) => {
                        const pct = totalVotes > 0 ? Math.round((opt.vote_count / totalVotes) * 100) : 0;
                        const isMyVote = post.user_voted_option_id === opt.id;

                        return hasVoted ? (
                          <div key={opt.id} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span className={cn(isMyVote && "font-medium")}>{opt.option_text}</span>
                              <span className="text-xs text-muted-foreground font-mono">{pct}%</span>
                            </div>
                            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                              <div
                                className={cn("h-full rounded-full transition-all", isMyVote ? "bg-primary" : "bg-muted-foreground/30")}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <button
                            key={opt.id}
                            type="button"
                            className="w-full rounded-md border px-3 py-2 text-left text-sm transition-colors hover:bg-muted/50"
                            onClick={() => handleVote(opt.id)}
                          >
                            {opt.option_text}
                          </button>
                        );
                      })}
                      {totalVotes > 0 && (
                        <p className="text-xs text-muted-foreground">{totalVotes} vote{totalVotes !== 1 ? "s" : ""}</p>
                      )}
                    </div>
                  )}

                  {/* Comment toggle */}
                  <button
                    type="button"
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => toggleExpand(post.id)}
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    {post.comment_count > 0 ? `${post.comment_count} comment${post.comment_count !== 1 ? "s" : ""}` : "Comment"}
                    {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </button>

                  {/* Comments section */}
                  {isExpanded && (
                    <div className="space-y-3 pt-1">
                      <Separator />
                      {commentsLoading ? (
                        <div className="h-8 animate-pulse rounded bg-muted/40" />
                      ) : (
                        <>
                          {comments.map((c) => (
                            <div key={c.id} className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <span className="font-medium text-foreground">
                                    {c.is_anonymous ? "Anonymous" : c.author_name || "User"}
                                  </span>
                                  <span>{format(new Date(c.created_at), "MMM d, h:mm a")}</span>
                                </div>
                                <p className="text-sm mt-0.5">{c.content}</p>
                              </div>
                              {c.user_id === currentUserId && (
                                <Button variant="ghost" size="sm" className="shrink-0 h-6 w-6 p-0 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteComment(c.id, post.id)}>
                                  <X className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          ))}
                        </>
                      )}

                      {/* Add comment */}
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <Input
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            placeholder="Write a comment..."
                            className="text-sm"
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleAddComment(post.id);
                              }
                            }}
                          />
                          <Button
                            size="sm"
                            disabled={commentSubmitting || !commentText.trim()}
                            onClick={() => handleAddComment(post.id)}
                          >
                            {commentSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                          </Button>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch id={`anon-${post.id}`} checked={commentAnon} onCheckedChange={setCommentAnon} className="scale-75" />
                          <Label htmlFor={`anon-${post.id}`} className="text-xs text-muted-foreground cursor-pointer">Post anonymously</Label>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
