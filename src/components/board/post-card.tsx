"use client";

import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  MessageCircle, Eye, Trash2, ChevronDown, ChevronUp, FileIcon, Pencil, Pin, Share2,
} from "lucide-react";
import { toast } from "sonner";
import { Post, Attachment, TYPE_CONFIG } from "@/components/board/types";

interface PostCardProps {
  post: Post;
  index: number;
  currentUserId: string | null;
  isAdmin: boolean;
  isExpanded: boolean;
  editingId: string | null;
  editTitle: string;
  setEditTitle: (v: string) => void;
  editContent: string;
  setEditContent: (v: string) => void;
  editPinned: boolean;
  setEditPinned: (v: boolean) => void;
  onStartEditing: (post: Post) => void;
  onCancelEditing: () => void;
  onSaveEdit: (postId: string) => void;
  onDelete: (postId: string) => void;
  onVote: (optionId: string, postId: string) => void;
  onToggleExpand: (postId: string) => void;
  onPreviewFile: (file: Attachment) => void;
  children?: React.ReactNode; // comment section
}

export function PostCard({
  post,
  index,
  currentUserId,
  isAdmin,
  isExpanded,
  editingId,
  editTitle,
  setEditTitle,
  editContent,
  setEditContent,
  editPinned,
  setEditPinned,
  onStartEditing,
  onCancelEditing,
  onSaveEdit,
  onDelete,
  onVote,
  onToggleExpand,
  onPreviewFile,
  children,
}: PostCardProps) {
  const typeConf = TYPE_CONFIG[post.type] || TYPE_CONFIG.discussion;
  const canDelete = post.user_id === currentUserId || isAdmin;
  const hasVoted = !!post.user_voted_option_id;
  const totalVotes = post.poll_options?.reduce((s, o) => s + o.vote_count, 0) ?? 0;

  return (
    <Card data-post-id={post.id} className="border bg-card animate-post-enter" style={{ animationDelay: `${Math.min(index * 40, 200)}ms`, animationFillMode: "both" }}>
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
              <Button variant="ghost" size="sm" className="press-effect" onClick={onCancelEditing}>Cancel</Button>
              <Button size="sm" onClick={() => onSaveEdit(post.id)} disabled={!editTitle.trim()} className="press-effect">Save</Button>
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
              {post.channel && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 text-muted-foreground">
                  #{post.channel}
                </Badge>
              )}
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
            <Button
              variant="ghost"
              size="sm"
              className="press-effect text-muted-foreground hover:text-foreground"
              onClick={() => {
                const url = `${window.location.origin}/dashboard/board?post=${post.id}`;
                navigator.clipboard.writeText(url).then(() => toast.success("Link copied"));
              }}
              aria-label="Share post"
            >
              <Share2 className="h-3.5 w-3.5" />
            </Button>
            {canDelete && (
              <>
                <Button variant="ghost" size="sm" className="press-effect text-muted-foreground hover:text-foreground" onClick={() => onStartEditing(post)} aria-label="Edit post">
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="sm" className="press-effect text-muted-foreground hover:text-destructive" onClick={() => onDelete(post.id)} aria-label="Delete post">
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
                  onClick={() => onPreviewFile(file)}
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
                  onClick={() => onVote(opt.id, post.id)}
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
          onClick={() => onToggleExpand(post.id)}
        >
          <MessageCircle className="h-3.5 w-3.5" />
          {post.comment_count > 0 ? `${post.comment_count} comment${post.comment_count !== 1 ? "s" : ""}` : "Comment"}
          {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>

        {/* Comments section (passed as children) */}
        {isExpanded && children}
        </>
        )}
      </CardContent>
    </Card>
  );
}
