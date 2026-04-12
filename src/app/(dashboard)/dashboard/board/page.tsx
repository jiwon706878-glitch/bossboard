"use client";

import { useState, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useBusinessStore } from "@/hooks/use-business";
import { useRoleStore } from "@/hooks/use-role";
import { boardKeys, userKeys, fetchCurrentUser, fetchProfile } from "@/lib/queries";
import { FilePreview } from "@/components/dashboard/file-preview";
import { FileSizeLimitModal } from "@/components/dashboard/file-size-limit-modal";
import { Button } from "@/components/ui/button";
import { uploadFile } from "@/lib/storage";
import { toast } from "sonner";
import { Plus, X, MessageCircle } from "lucide-react";
import { Post, Attachment, Comment } from "@/components/board/types";
import { CreatePostForm } from "@/components/board/create-post-form";
import { PostCard } from "@/components/board/post-card";
import { CommentSection } from "@/components/board/comment-section";
import { plans, type PlanId } from "@/config/plans";

// ─── BB v2.0 Day 7: channel definitions ─────────────────────────────────────
// The DB enforces these via a CHECK constraint on board_posts.channel.
// Keep this list in sync with 20260414100000_board_channels.sql.
type Channel = "general" | "team" | "agent-activity" | "announcements";
const CHANNELS: Array<{ id: Channel; label: string; hint: string }> = [
  { id: "general", label: "# general", hint: "Catch-all team chat" },
  { id: "team", label: "# team", hint: "Internal discussion" },
  { id: "agent-activity", label: "# agent-activity", hint: "Agent updates" },
  { id: "announcements", label: "# announcements", hint: "Workspace news" },
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function BoardPage() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const currentBusiness = useBusinessStore((s) => s.currentBusiness);
  const businessId = currentBusiness?.id;
  const { isAdmin } = useRoleStore();

  // Use shared user query instead of calling getUser() in every board query
  const { data: currentUser } = useQuery({ queryKey: userKeys.current, queryFn: fetchCurrentUser, retry: false });
  const currentUserId = currentUser?.id ?? null;

  // BB v2.0 Day 7: which channel is the user looking at? Drives the
  // post-fetch query AND the channel a new post is filed under.
  const [activeChannel, setActiveChannel] = useState<Channel>("general");

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

  // File size limit modal
  const [oversizedFile, setOversizedFile] = useState<{ size: number; limitMb: number } | null>(null);

  // Expanded post (for comments)
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  // Tracks which post's comment load is currently active; prevents stale races
  const loadingPostRef = useRef<string | null>(null);
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

  // User plan for file size limits
  const { data: profile } = useQuery({
    queryKey: userKeys.profile(currentUserId ?? ""),
    queryFn: () => fetchProfile(currentUserId!),
    enabled: !!currentUserId,
    staleTime: 5 * 60 * 1000,
  });

  const planId = (profile?.plan_id || "free") as PlanId;
  const plan = plans[planId];
  const nextTierMap: Record<PlanId, PlanId> = { free: "starter", starter: "pro", pro: "business", business: "business" };
  const nextPlan = plans[nextTierMap[planId]];

  // ─── Load posts via React Query ──────────────────────────────────────────

  const { data: posts = [], isLoading: loading } = useQuery({
    // Channel is part of the cache key so switching channels doesn't
    // flash the previous channel's posts.
    queryKey: [...boardKeys.all(businessId ?? ""), activeChannel],
    queryFn: async (): Promise<Post[]> => {
      if (!businessId || !currentUserId) return [];

      const { data: postsData } = await supabase
        .from("board_posts")
        .select("id, user_id, type, title, content, is_pinned, created_at, attachments")
        .eq("business_id", businessId)
        .eq("channel", activeChannel)
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
        supabase.from("poll_votes").select("option_id, user_id").eq("user_id", currentUserId),
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
      const notices = enriched.filter((p) => p.type === "notice");
      for (const n of notices) {
        supabase.from("board_post_reads").upsert(
          { post_id: n.id, user_id: currentUserId },
          { onConflict: "post_id,user_id" }
        ).then(() => {});
      }

      return enriched;
    },
    enabled: !!businessId && !!currentUserId,
  });

  function invalidateBoard() {
    if (businessId) {
      // Invalidate every channel's cached query for this business —
      // boardKeys.all is the prefix, so passing it without the
      // channel suffix matches all four channel-specific keys.
      queryClient.invalidateQueries({ queryKey: boardKeys.all(businessId) });
    }
  }

  // ─── Create post ─────────────────────────────────────────────────────────

  async function handleCreatePost(e: React.FormEvent) {
    e.preventDefault();
    if (!formTitle.trim() || !currentBusiness?.id) return;
    setSubmitting(true);

    if (!currentUserId) { toast.error("Not logged in"); setSubmitting(false); return; }

    // Validate poll has at least 2 non-empty options BEFORE creating the post
    if (formType === "poll") {
      const validOptions = pollInputs.filter((o) => o.trim());
      if (validOptions.length < 2) {
        toast.error("Polls need at least 2 options");
        setSubmitting(false);
        return;
      }
    }

    // Validate file sizes against plan limit
    const maxBytes = plan.limits.fileSizeMb * 1024 * 1024;
    for (const file of formAttachments) {
      if (file.size === 0) {
        toast.error(`${file.name} is empty`);
        continue;
      }
      if (file.size > maxBytes) {
        setOversizedFile({ size: file.size, limitMb: plan.limits.fileSizeMb });
        setSubmitting(false);
        return;
      }
    }

    // Upload attachments — use UUID path to avoid special character issues
    const uploadedFiles: Attachment[] = [];
    if (formAttachments.length > 0) {
      for (const file of formAttachments) {
        if (file.size === 0) continue;
        const fileExt = file.name.split(".").pop() || "bin";
        const storageKey = `${currentBusiness.id}/board/${crypto.randomUUID()}.${fileExt}`;
        try {
          const arrayBuffer = await file.arrayBuffer();
          const result = await uploadFile({
            key: storageKey,
            body: Buffer.from(arrayBuffer),
            contentType: file.type,
          });
          uploadedFiles.push({ name: file.name, url: result.url, type: file.type, size: file.size });
        } catch (err) {
          console.error("[board] File upload failed");
          toast.error(`Failed to upload ${file.name}`);
        }
      }
    }

    const { data: post, error } = await supabase
      .from("board_posts")
      .insert({
        business_id: currentBusiness.id,
        user_id: currentUserId,
        type: formType,
        title: formTitle.trim(),
        content: formContent.trim() || null,
        is_pinned: formPinned && formType === "notice",
        attachments: uploadedFiles.length > 0 ? uploadedFiles : null,
        // BB v2.0 Day 7: file the new post in the currently-selected
        // channel so it appears immediately after closing the form.
        channel: activeChannel,
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
        const { error: pollError } = await supabase.from("poll_options").insert(
          validOptions.map((text, i) => ({
            post_id: post.id,
            option_text: text.trim(),
            sort_order: i,
          }))
        );
        if (pollError) {
          toast.error("Post created but poll options failed to save");
          console.error("[board] Poll options insert failed:", pollError.message);
        }
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
    if (businessId) {
      queryClient.setQueryData(boardKeys.all(businessId), (old: Post[] | undefined) => {
        if (!old) return old;
        return old.map((p) => p.id === postId ? { ...p, title: editTitle.trim(), content: editContent.trim() || null, is_pinned: editPinned } : p);
      });
    }
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
    if (businessId) {
      queryClient.setQueryData(boardKeys.all(businessId), (old: Post[] | undefined) => {
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
    }

    // Server update
    const optionIds = post.poll_options.map((o) => o.id);
    try {
      await supabase.from("poll_votes").delete().eq("user_id", currentUserId).in("option_id", optionIds);
      await supabase.from("poll_votes").insert({ option_id: optionId, user_id: currentUserId });
    } catch {
      toast.error("Failed to vote");
      invalidateBoard();
      setVotingLock(false);
      return;
    }

    // Refresh with actual server data
    setTimeout(() => {
      invalidateBoard();
      setVotingLock(false);
    }, 800);
  }

  // ─── Comments ────────────────────────────────────────────────────────────

  async function loadComments(postId: string) {
    loadingPostRef.current = postId;
    setCommentsLoading(true);
    const { data } = await supabase
      .from("board_comments")
      .select("id, user_id, content, is_anonymous, created_at, parent_id")
      .eq("post_id", postId)
      .order("created_at");

    // Bail out if user moved on to a different post while this query was in flight
    if (loadingPostRef.current !== postId) return;

    if (data && data.length > 0) {
      const userIds = [...new Set(data.filter((c: any) => !c.is_anonymous).map((c: any) => c.user_id))];
      const { data: profiles } = userIds.length > 0
        ? await supabase.from("profiles").select("id, full_name").in("id", userIds)
        : { data: [] };

      // Check again after the profiles round-trip
      if (loadingPostRef.current !== postId) return;

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
      loadingPostRef.current = null;
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
      if (businessId) {
        queryClient.setQueryData(boardKeys.all(businessId), (prev: Post[] | undefined) =>
          (prev ?? []).map((p) => p.id === postId ? { ...p, comment_count: p.comment_count + 1 } : p)
        );
      }
    }
    setCommentSubmitting(false);
  }

  async function handleDeleteComment(commentId: string, postId: string) {
    await supabase.from("board_comments").delete().eq("id", commentId);
    loadComments(postId);
    if (businessId) {
      queryClient.setQueryData(boardKeys.all(businessId), (prev: Post[] | undefined) =>
        (prev ?? []).map((p) => p.id === postId ? { ...p, comment_count: Math.max(0, p.comment_count - 1) } : p)
      );
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  if (!businessId) {
    return (
      <div className="mx-auto max-w-2xl p-8 text-center">
        <p className="text-muted-foreground">Select a workspace to view the board.</p>
      </div>
    );
  }

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

      {/* BB v2.0 Day 7: channel tabs. Switching channels just bumps
          activeChannel state — the React Query key includes channel
          so each tab has its own cached posts list. New posts go
          into the currently-active channel. */}
      <div className="flex gap-1 border-b overflow-x-auto -mx-1 px-1">
        {CHANNELS.map((c) => {
          const isActive = c.id === activeChannel;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setActiveChannel(c.id)}
              className={`relative px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
                isActive
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title={c.hint}
            >
              {c.label}
              {isActive && (
                <span className="absolute inset-x-0 -bottom-px h-0.5 bg-primary" />
              )}
            </button>
          );
        })}
      </div>

      {/* Create form — two-step mount then CSS transition for smooth open/close */}
      {formMounted && (
        <CreatePostForm
          formVisible={formVisible}
          formType={formType}
          setFormType={setFormType}
          formTitle={formTitle}
          setFormTitle={setFormTitle}
          formContent={formContent}
          setFormContent={setFormContent}
          formPinned={formPinned}
          setFormPinned={setFormPinned}
          pollInputs={pollInputs}
          setPollInputs={setPollInputs}
          formAttachments={formAttachments}
          setFormAttachments={setFormAttachments}
          fileInputRef={fileInputRef}
          submitting={submitting}
          onSubmit={handleCreatePost}
        />
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
        <div className="space-y-3 stagger-children">
          {posts.map((post, index) => (
            <PostCard
              key={post.id}
              post={post}
              index={index}
              currentUserId={currentUserId}
              isAdmin={isAdmin()}
              isExpanded={expandedId === post.id}
              editingId={editingId}
              editTitle={editTitle}
              setEditTitle={setEditTitle}
              editContent={editContent}
              setEditContent={setEditContent}
              editPinned={editPinned}
              setEditPinned={setEditPinned}
              onStartEditing={startEditing}
              onCancelEditing={() => setEditingId(null)}
              onSaveEdit={handleUpdatePost}
              onDelete={handleDeletePostAnimated}
              onVote={handleVote}
              onToggleExpand={toggleExpand}
              onPreviewFile={setPreviewFile}
            >
              <CommentSection
                postId={post.id}
                comments={comments}
                commentsLoading={commentsLoading}
                commentText={commentText}
                setCommentText={setCommentText}
                commentAnon={commentAnon}
                setCommentAnon={setCommentAnon}
                commentSubmitting={commentSubmitting}
                replyingTo={replyingTo}
                setReplyingTo={setReplyingTo}
                currentUserId={currentUserId}
                onAddComment={handleAddComment}
                onDeleteComment={handleDeleteComment}
              />
            </PostCard>
          ))}
        </div>
      )}

      <FileSizeLimitModal
        open={!!oversizedFile}
        onClose={() => setOversizedFile(null)}
        fileSize={oversizedFile?.size ?? 0}
        limitMb={oversizedFile?.limitMb ?? 0}
        planName={plan.name}
        nextPlanName={nextPlan.name}
        nextPlanLimitMb={nextPlan.limits.fileSizeMb}
        nextPlanStorageGb={nextPlan.limits.storageGb}
        nextPlanPrice={nextPlan.monthlyPrice}
      />

      <FilePreview file={previewFile} onClose={() => setPreviewFile(null)} />
    </div>
  );
}
