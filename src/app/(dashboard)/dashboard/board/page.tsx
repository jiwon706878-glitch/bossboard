"use client";

import { useState, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { useBusinessStore } from "@/hooks/use-business";
import { useRoleStore } from "@/hooks/use-role";
import { boardKeys } from "@/lib/queries";
import { FilePreview } from "@/components/dashboard/file-preview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  Loader2, Plus, Send, MessageCircle,
  Eye, Trash2, X, ChevronDown, ChevronUp, Paperclip, FileIcon, Pencil, Pin,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Attachment {
  name: string;
  url: string;
  type: string;
  size: number;
}

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
  attachments?: Attachment[] | null;
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
  parent_id: string | null;
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
  const queryClient = useQueryClient();
  const currentBusiness = useBusinessStore((s) => s.currentBusiness);
  const businessId = currentBusiness?.id;
  const { isAdmin } = useRoleStore();

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Create form — two-step mount/visible for smooth CSS transition
  const [formMounted, setFormMounted] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [formType, setFormType] = useState("discussion");
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formPinned, setFormPinned] = useState(false);
  const [pollInputs, setPollInputs] = useState(["", ""]);
  const [submitting, setSubmitting] = useState(false);
  const [formAttachments, setFormAttachments] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // File preview
  const [previewFile, setPreviewFile] = useState<Attachment | null>(null);

  // Expanded post (for comments)
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentAnon, setCommentAnon] = useState(false);
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  // Edit post
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editPinned, setEditPinned] = useState(false);

  // Vote lock
  const [votingLock, setVotingLock] = useState(false);

  // ─── Load posts via React Query ──────────────────────────────────────────

  const { data: posts = [], isLoading: loading } = useQuery({
    queryKey: boardKeys.all(businessId ?? ""),
    queryFn: async (): Promise<Post[]> => {
      if (!businessId) return [];

      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);

      const { data: postsData } = await supabase
        .from("board_posts")
        .select("id, user_id, type, title, content, is_pinned, created_at, attachments")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false });

      if (!postsData || postsData.length === 0) return [];

      const postIds = postsData.map((p: any) => p.id);

      const [
        { data: commentCounts },
        { data: readCounts },
        { data: profiles },
        { data: pollOptions },
        { data: pollVotes },
      ] = await Promise.all([
        supabase.from("board_comments").select("post_id").in("post_id", postIds),
        supabase.from("board_post_reads").select("post_id").in("post_id", postIds),
        supabase.from("profiles").select("id, full_name").in("id", [...new Set(postsData.map((p: any) => p.user_id))]),
        supabase.from("poll_options").select("id, post_id, option_text, sort_order").in("post_id", postIds).order("sort_order"),
        user ? supabase.from("poll_votes").select("option_id, user_id").eq("user_id", user.id) : Promise.resolve({ data: [] }),
      ]);

      const optionIds = (pollOptions ?? []).map((o: any) => o.id);
      const { data: allVotes } = optionIds.length > 0
        ? await supabase.from("poll_votes").select("option_id").in("option_id", optionIds)
        : { data: [] };

      const voteCounts = new Map<string, number>();
      for (const v of allVotes ?? []) voteCounts.set(v.option_id, (voteCounts.get(v.option_id) ?? 0) + 1);

      const nameMap = new Map((profiles ?? []).map((p: any) => [p.id, p.full_name]));
      const commentCountMap = new Map<string, number>();
      for (const c of commentCounts ?? []) commentCountMap.set(c.post_id, (commentCountMap.get(c.post_id) ?? 0) + 1);
      const readCountMap = new Map<string, number>();
      for (const r of readCounts ?? []) readCountMap.set(r.post_id, (readCountMap.get(r.post_id) ?? 0) + 1);

      const userVotedOptions = new Set((pollVotes ?? []).map((v: any) => v.option_id));

      const enriched: Post[] = postsData.map((p: any) => {
        const opts = (pollOptions ?? [])
          .filter((o: any) => o.post_id === p.id)
          .map((o: any) => ({ id: o.id, option_text: o.option_text, vote_count: voteCounts.get(o.id) ?? 0 }));
        const votedOpt = opts.find((o: any) => userVotedOptions.has(o.id));
        return {
          id: p.id, user_id: p.user_id, type: p.type, title: p.title, content: p.content,
          is_pinned: p.is_pinned, created_at: p.created_at,
          author_name: nameMap.get(p.user_id) ?? null,
          comment_count: commentCountMap.get(p.id) ?? 0, read_count: readCountMap.get(p.id) ?? 0,
          poll_options: opts.length > 0 ? opts : undefined, user_voted_option_id: votedOpt?.id ?? null,
          attachments: p.attachments ?? null,
        };
      });

      enriched.sort((a, b) => {
        if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      // Mark notices as read (fire-and-forget)
      if (user) {
        const notices = enriched.filter((p) => p.type === "notice");
        for (const n of notices) {
          supabase.from("board_post_reads").upsert(
            { post_id: n.id, user_id: user.id },
            { onConflict: "post_id,user_id" }
          ).then(() => {});
        }
      }

      return enriched;
    },
    enabled: !!businessId,
  });

  function invalidateBoard() {
    queryClient.invalidateQueries({ queryKey: boardKeys.all(businessId!) });
  }

  // ─── Create post ─────────────────────────────────────────────────────────

  async function handleCreatePost(e: React.FormEvent) {
    e.preventDefault();
    if (!formTitle.trim() || !currentBusiness?.id) return;
    setSubmitting(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("Not logged in"); setSubmitting(false); return; }

    // Upload attachments — use UUID path to avoid special character issues
    const uploadedFiles: Attachment[] = [];
    if (formAttachments.length > 0) {
      // Ensure bucket exists (silently fails if already created)
      await supabase.storage.createBucket("attachments", { public: true, fileSizeLimit: 10485760 });

      for (const file of formAttachments) {
        const fileExt = file.name.split(".").pop() || "bin";
        const storagePath = `${currentBusiness.id}/board/${crypto.randomUUID()}.${fileExt}`;
        console.log("Uploading:", file.name, "→", storagePath, "size:", file.size, "type:", file.type);
        const { data, error: uploadErr } = await supabase.storage
          .from("attachments")
          .upload(storagePath, file, { contentType: file.type });
        if (uploadErr) {
          console.error("UPLOAD ERROR:", JSON.stringify(uploadErr), "file:", file.name);
          toast.error(`Failed to upload ${file.name}`);
          continue;
        }
        if (data) {
          const { data: urlData } = supabase.storage.from("attachments").getPublicUrl(data.path);
          uploadedFiles.push({ name: file.name, url: urlData.publicUrl, type: file.type, size: file.size });
        }
      }
    }

    const { data: post, error } = await supabase
      .from("board_posts")
      .insert({
        business_id: currentBusiness.id,
        user_id: user.id,
        type: formType,
        title: formTitle.trim(),
        content: formContent.trim() || null,
        is_pinned: formPinned && formType === "notice",
        attachments: uploadedFiles.length > 0 ? uploadedFiles : null,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Post creation error:", error.message);
      toast.error("Failed to create post. Please try again.");
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
    setSubmitting(false);
    closeForm();
    invalidateBoard();
  }

  // ─── Edit post ──────────────────────────────────────────────────────────

  function startEditing(post: Post) {
    setEditingId(post.id);
    setEditTitle(post.title);
    setEditContent(post.content || "");
    setEditPinned(post.is_pinned);
  }

  async function handleUpdatePost(postId: string) {
    if (!editTitle.trim()) return;

    // Optimistic update — show new content immediately
    queryClient.setQueryData(boardKeys.all(businessId!), (old: Post[] | undefined) => {
      if (!old) return old;
      return old.map((p) => p.id === postId ? { ...p, title: editTitle.trim(), content: editContent.trim() || null, is_pinned: editPinned } : p);
    });
    setEditingId(null);

    const { error } = await supabase
      .from("board_posts")
      .update({ title: editTitle.trim(), content: editContent.trim() || null, is_pinned: editPinned })
      .eq("id", postId);
    if (error) {
      toast.error("Failed to update post");
      invalidateBoard(); // Revert
      return;
    }
    toast.success("Updated");
    setTimeout(() => invalidateBoard(), 500);
  }

  // ─── Delete with animation ─────────────────────────────────────────────

  async function handleDeletePostAnimated(postId: string) {
    const card = document.querySelector(`[data-post-id="${postId}"]`) as HTMLElement | null;
    if (card) {
      // Step 1: Fade + shrink
      card.style.transition = "all 350ms cubic-bezier(0.16, 1, 0.3, 1)";
      card.style.transform = "scale(0.95)";
      card.style.opacity = "0";
      await new Promise((r) => setTimeout(r, 200));
      // Step 2: Collapse height + hide borders
      card.style.borderColor = "transparent";
      card.style.boxShadow = "none";
      const h = card.scrollHeight;
      card.style.maxHeight = h + "px";
      requestAnimationFrame(() => {
        card.style.maxHeight = "0px";
        card.style.marginBottom = "0px";
        card.style.paddingTop = "0px";
        card.style.paddingBottom = "0px";
        card.style.overflow = "hidden";
      });
      await new Promise((r) => setTimeout(r, 350));
    }
    const { error } = await supabase.from("board_posts").delete().eq("id", postId);
    if (error) { toast.error("Failed to delete post"); invalidateBoard(); return; }
    toast.success("Post deleted");
    invalidateBoard();
  }

  const openForm = useCallback(() => {
    setFormMounted(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setFormVisible(true));
    });
  }, []);

  const closeForm = useCallback(() => {
    setFormVisible(false);
    setTimeout(() => {
      setFormMounted(false);
      setFormTitle(""); setFormContent(""); setFormType("discussion");
      setFormPinned(false); setPollInputs(["", ""]); setFormAttachments([]);
    }, 400);
  }, []);

  // ─── Poll vote ───────────────────────────────────────────────────────────

  async function handleVote(optionId: string, postId: string) {
    if (!currentUserId || votingLock) return;
    setVotingLock(true);

    const post = posts.find((p) => p.id === postId);
    if (!post?.poll_options) { setVotingLock(false); return; }

    const previousVoteId = post.user_voted_option_id;

    // Clicking same option — do nothing
    if (previousVoteId === optionId) {
      setVotingLock(false);
      return;
    }

    // Optimistic update
    queryClient.setQueryData(boardKeys.all(businessId!), (old: Post[] | undefined) => {
      if (!old) return old;
      return old.map((p) => {
        if (p.id !== postId || !p.poll_options) return p;
        return {
          ...p,
          poll_options: p.poll_options.map((o) => ({
            ...o,
            vote_count: o.id === optionId
              ? o.vote_count + 1
              : o.id === previousVoteId
                ? Math.max(0, o.vote_count - 1)
                : o.vote_count,
          })),
          user_voted_option_id: optionId,
        };
      });
    });

    // Server update
    const optionIds = post.poll_options.map((o) => o.id);
    try {
      await supabase.from("poll_votes").delete().eq("user_id", currentUserId).in("option_id", optionIds);
      await supabase.from("poll_votes").insert({ option_id: optionId, user_id: currentUserId });
    } catch {
      toast.error("Failed to vote");
      invalidateBoard();
    }

    // Refresh with actual server data
    setTimeout(() => {
      invalidateBoard();
      setVotingLock(false);
    }, 800);
  }

  // ─── Comments ────────────────────────────────────────────────────────────

  async function loadComments(postId: string) {
    setCommentsLoading(true);
    const { data } = await supabase
      .from("board_comments")
      .select("id, user_id, content, is_anonymous, created_at, parent_id")
      .eq("post_id", postId)
      .order("created_at");

    if (data && data.length > 0) {
      const userIds = [...new Set(data.filter((c: any) => !c.is_anonymous).map((c: any) => c.user_id))];
      const { data: profiles } = userIds.length > 0
        ? await supabase.from("profiles").select("id, full_name").in("id", userIds)
        : { data: [] };
      const nameMap = new Map((profiles ?? []).map((p: any) => [p.id, p.full_name]));

      setComments(data.map((c: any) => ({
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
    setReplyingTo(null);
  }

  async function handleAddComment(postId: string) {
    if (!commentText.trim()) return;
    setCommentSubmitting(true);

    const { error } = await supabase.from("board_comments").insert({
      post_id: postId,
      user_id: currentUserId,
      content: commentText.trim(),
      is_anonymous: commentAnon,
      parent_id: replyingTo ?? null,
    });

    if (error) { console.error("Comment error:", error.message); toast.error("Failed to post comment. Please try again."); }
    else {
      setCommentText("");
      setCommentAnon(false);
      setReplyingTo(null);
      loadComments(postId);
      // Update comment count locally
      queryClient.setQueryData(boardKeys.all(businessId!), (prev: Post[] | undefined) =>
        (prev ?? []).map((p) => p.id === postId ? { ...p, comment_count: p.comment_count + 1 } : p)
      );
    }
    setCommentSubmitting(false);
  }

  async function handleDeleteComment(commentId: string, postId: string) {
    await supabase.from("board_comments").delete().eq("id", commentId);
    loadComments(postId);
    queryClient.setQueryData(boardKeys.all(businessId!), (prev: Post[] | undefined) =>
      (prev ?? []).map((p) => p.id === postId ? { ...p, comment_count: Math.max(0, p.comment_count - 1) } : p)
    );
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Board</h1>
          <p className="text-muted-foreground">Team bulletin board</p>
        </div>
        <Button className="press-effect" onClick={formMounted ? closeForm : openForm}>
          {formMounted ? <X className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
          {formMounted ? "Cancel" : "New Post"}
        </Button>
      </div>

      {/* Create form — two-step mount then CSS transition for smooth open/close */}
      {formMounted && (
      <div className={cn(
        "overflow-hidden transition-all duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
        formVisible ? "max-h-[700px] opacity-100 mb-0" : "max-h-0 opacity-0 mb-0"
      )}>
        <Card data-board-form>
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
                <Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }} placeholder="Post title" required />
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
                        data-poll-input
                        value={opt}
                        onChange={(e) => {
                          const next = [...pollInputs];
                          next[i] = e.target.value;
                          setPollInputs(next);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            if (i === pollInputs.length - 1 && opt.trim() && pollInputs.length < 5) {
                              setPollInputs((prev) => [...prev, ""]);
                            }
                            setTimeout(() => {
                              const inputs = document.querySelectorAll<HTMLInputElement>('[data-poll-input]');
                              if (inputs[i + 1]) inputs[i + 1].focus();
                            }, 100);
                          }
                        }}
                        placeholder={`Option ${i + 1}`}
                        className="text-sm"
                      />
                      {pollInputs.length > 2 && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => setPollInputs(pollInputs.filter((_, j) => j !== i))} aria-label="Remove option">
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

              {/* Attachment preview chips */}
              {formAttachments.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formAttachments.map((file, i) => (
                    <div key={i} className="flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs bg-muted/50">
                      <FileIcon className="h-3 w-3 text-muted-foreground" />
                      <span className="truncate max-w-[120px]">{file.name}</span>
                      <span className="text-muted-foreground">({(file.size / 1024).toFixed(0)}KB)</span>
                      <button
                        type="button"
                        onClick={() => setFormAttachments((prev) => prev.filter((_, idx) => idx !== i))}
                        className="text-muted-foreground hover:text-destructive ml-1"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    setFormAttachments((prev) => [...prev, ...files]);
                    e.target.value = "";
                  }}
                />
                <Button type="button" variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()}>
                  <Paperclip className="h-4 w-4 mr-1" />
                  Attach
                </Button>
                <Button type="submit" disabled={submitting || !formTitle.trim()} className="press-effect">
                  {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  {submitting ? "Posting..." : "Post"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
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
          {posts.map((post, index) => {
            const typeConf = TYPE_CONFIG[post.type] || TYPE_CONFIG.discussion;
            const isExpanded = expandedId === post.id;
            const canDelete = post.user_id === currentUserId || isAdmin();
            const hasVoted = !!post.user_voted_option_id;
            const totalVotes = post.poll_options?.reduce((s, o) => s + o.vote_count, 0) ?? 0;

            return (
              <Card key={post.id} data-post-id={post.id} className="border bg-card animate-post-enter" style={{ animationDelay: `${Math.min(index * 40, 200)}ms`, animationFillMode: "both" }}>
                <CardContent className="py-4 space-y-3">
                  {/* Edit mode */}
                  {editingId === post.id ? (
                    <div className="space-y-3 animate-center-scale-in">
                      <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }} placeholder="Post title" />
                      <Textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} rows={3} placeholder="Post content" />
                      {post.type === "notice" && (
                        <div className="flex items-center gap-2">
                          <Switch checked={editPinned} onCheckedChange={setEditPinned} />
                          <Label className="text-sm">Pin to top</Label>
                        </div>
                      )}
                      {post.type === "poll" && (
                        <p className="text-xs text-muted-foreground">Poll options cannot be edited after creation.</p>
                      )}
                      <div className="flex gap-2 justify-end">
                        <Button variant="ghost" size="sm" className="press-effect" onClick={() => setEditingId(null)}>Cancel</Button>
                        <Button size="sm" onClick={() => handleUpdatePost(post.id)} disabled={!editTitle.trim()} className="press-effect">Save</Button>
                      </div>
                    </div>
                  ) : (
                  <>
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary" className={cn("text-[10px] px-1.5 py-0.5", typeConf.color)}>
                          {typeConf.label}
                        </Badge>
                        {post.is_pinned && <Pin className="h-3.5 w-3.5 text-amber-500 fill-amber-500 shrink-0" />}
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
                    <div className="flex items-center gap-1 shrink-0">
                      {canDelete && (
                        <>
                          <Button variant="ghost" size="sm" className="press-effect text-muted-foreground hover:text-foreground" onClick={() => startEditing(post)} aria-label="Edit post">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" className="press-effect text-muted-foreground hover:text-destructive" onClick={() => handleDeletePostAnimated(post.id)} aria-label="Delete post">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  {post.content && (
                    <p className="text-sm whitespace-pre-wrap">{post.content}</p>
                  )}

                  {/* Attachments */}
                  {post.attachments && post.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {post.attachments.map((file, i) => {
                        const isImage = file.type?.startsWith("image/");
                        return (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setPreviewFile(file)}
                            className="group relative rounded-md border overflow-hidden hover:border-primary transition-colors"
                          >
                            {isImage ? (
                              <img src={file.url} alt={file.name} className="h-20 w-20 object-cover" />
                            ) : (
                              <div className="h-20 w-20 flex flex-col items-center justify-center bg-muted/50 px-1">
                                <FileIcon className="h-6 w-6 text-muted-foreground mb-1" />
                                <span className="text-[9px] text-muted-foreground truncate w-full text-center">
                                  {file.name.split(".").pop()?.toUpperCase()}
                                </span>
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Poll */}
                  {post.type === "poll" && post.poll_options && (
                    <div className="space-y-2">
                      {post.poll_options.map((opt) => {
                        const pct = totalVotes > 0 ? Math.round((opt.vote_count / totalVotes) * 100) : 0;
                        const isMyVote = post.user_voted_option_id === opt.id;

                        return (
                          <button
                            key={opt.id}
                            type="button"
                            className={cn(
                              "w-full rounded-md border px-3 py-2 text-left text-sm transition-colors press-effect",
                              isMyVote ? "border-primary bg-primary/10" : "hover:bg-muted/50"
                            )}
                            onClick={() => handleVote(opt.id, post.id)}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className={cn("text-sm", isMyVote && "font-medium text-primary")}>{opt.option_text}</span>
                              {totalVotes > 0 && <span className="text-xs text-muted-foreground font-mono">{pct}%</span>}
                            </div>
                            {totalVotes > 0 && (
                              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                                <div
                                  className={cn("h-full rounded-full transition-all", isMyVote ? "bg-primary" : "bg-muted-foreground/30")}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            )}
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
                    <div className="border-t pt-3 mt-3">
                      {commentsLoading ? (
                        <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground animate-pulse">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Loading comments...
                        </div>
                      ) : (
                        <div className="animate-center-scale-in space-y-3">
                          {comments.filter((c) => !c.parent_id).map((c) => {
                            const replies = comments.filter((r) => r.parent_id === c.id);
                            return (
                              <div key={c.id}>
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                      <span className="font-medium text-foreground">
                                        {c.is_anonymous ? "Anonymous" : c.author_name || "User"}
                                      </span>
                                      <span>{format(new Date(c.created_at), "MMM d, h:mm a")}</span>
                                    </div>
                                    <p className="text-sm mt-0.5">{c.content}</p>
                                    <button
                                      type="button"
                                      className="text-xs text-muted-foreground hover:text-foreground mt-1 transition-colors"
                                      onClick={() => setReplyingTo(replyingTo === c.id ? null : c.id)}
                                    >
                                      Reply
                                    </button>
                                  </div>
                                  {c.user_id === currentUserId && (
                                    <Button variant="ghost" size="sm" className="shrink-0 h-6 w-6 p-0 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteComment(c.id, post.id)} aria-label="Delete comment">
                                      <X className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                                {/* Replies */}
                                {replies.length > 0 && (
                                  <div className="ml-8 border-l pl-3 space-y-2 mt-2">
                                    {replies.map((r) => (
                                      <div key={r.id} className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <span className="font-medium text-foreground">
                                              {r.is_anonymous ? "Anonymous" : r.author_name || "User"}
                                            </span>
                                            <span>{format(new Date(r.created_at), "MMM d, h:mm a")}</span>
                                          </div>
                                          <p className="text-sm mt-0.5">{r.content}</p>
                                        </div>
                                        {r.user_id === currentUserId && (
                                          <Button variant="ghost" size="sm" className="shrink-0 h-6 w-6 p-0 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteComment(r.id, post.id)} aria-label="Delete comment">
                                            <X className="h-3 w-3" />
                                          </Button>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}

                      {/* Add comment */}
                      <div className="space-y-2">
                        {replyingTo && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>Replying to {(() => { const rc = comments.find((c) => c.id === replyingTo); return rc?.is_anonymous ? "Anonymous" : rc?.author_name || "User"; })()}</span>
                            <button
                              type="button"
                              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                              onClick={() => setReplyingTo(null)}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        )}
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
                            aria-label="Send comment"
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
                    </div>
                  )}
                  </>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <FilePreview file={previewFile} onClose={() => setPreviewFile(null)} />
    </div>
  );
}
