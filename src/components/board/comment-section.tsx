"use client";

import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Loader2, Send, X,
} from "lucide-react";
import { Comment } from "@/components/board/types";

interface CommentSectionProps {
  postId: string;
  comments: Comment[];
  commentsLoading: boolean;
  commentText: string;
  setCommentText: (v: string) => void;
  commentAnon: boolean;
  setCommentAnon: (v: boolean) => void;
  commentSubmitting: boolean;
  replyingTo: string | null;
  setReplyingTo: (v: string | null) => void;
  currentUserId: string | null;
  onAddComment: (postId: string) => void;
  onDeleteComment: (commentId: string, postId: string) => void;
}

export function CommentSection({
  postId,
  comments,
  commentsLoading,
  commentText,
  setCommentText,
  commentAnon,
  setCommentAnon,
  commentSubmitting,
  replyingTo,
  setReplyingTo,
  currentUserId,
  onAddComment,
  onDeleteComment,
}: CommentSectionProps) {
  return (
    <div className="border-t pt-3 mt-3">
      {commentsLoading ? (
        <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground animate-pulse">
          <Loader2 className="h-3 w-3 animate-spin" />
          Loading comments...
        </div>
      ) : (
        <div className="animate-center-scale-in space-y-3 stagger-children">
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
                    <Button variant="ghost" size="sm" className="shrink-0 h-6 w-6 p-0 text-muted-foreground hover:text-destructive" onClick={() => onDeleteComment(c.id, postId)} aria-label="Delete comment">
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
                          <Button variant="ghost" size="sm" className="shrink-0 h-6 w-6 p-0 text-muted-foreground hover:text-destructive" onClick={() => onDeleteComment(r.id, postId)} aria-label="Delete comment">
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
                    onAddComment(postId);
                  }
                }}
              />
              <Button
                size="sm"
                disabled={commentSubmitting || !commentText.trim()}
                onClick={() => onAddComment(postId)}
                aria-label="Send comment"
              >
                {commentSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Switch id={`anon-${postId}`} checked={commentAnon} onCheckedChange={setCommentAnon} className="scale-75" />
              <Label htmlFor={`anon-${postId}`} className="text-xs text-muted-foreground cursor-pointer">Post anonymously</Label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
