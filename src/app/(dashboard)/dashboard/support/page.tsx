"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { fetchCurrentUser, userKeys } from "@/lib/queries";
import { notifyAdmins } from "@/lib/notifications";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Send, Loader2, MessageCircle, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

const supabase = createClient();

interface Thread {
  id: string;
  subject: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface Message {
  id: string;
  sender_id: string;
  sender_type: string;
  content: string;
  created_at: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  open: {
    label: "Open",
    className:
      "bg-[var(--accent)]/15 text-[var(--accent)] border-[var(--accent)]/30",
  },
  in_progress: {
    label: "In Progress",
    className:
      "bg-[var(--warning)]/15 text-[var(--warning)] border-[var(--warning)]/30",
  },
  resolved: {
    label: "Resolved",
    className:
      "bg-[var(--success)]/15 text-[var(--success)] border-[var(--success)]/30",
  },
};

export default function SupportPage() {
  const queryClient = useQueryClient();

  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [replyText, setReplyText] = useState("");
  const [creating, setCreating] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: user } = useQuery({
    queryKey: userKeys.current,
    queryFn: fetchCurrentUser,
    retry: false,
  });

  const userName = user?.user_metadata?.full_name ?? user?.email ?? "User";

  /* ── Thread list ── */
  const { data: threads = [], isLoading } = useQuery<Thread[]>({
    queryKey: ["support-threads"],
    queryFn: async () => {
      const { data } = await supabase
        .from("support_threads")
        .select("id, subject, status, created_at, updated_at")
        .order("updated_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  /* ── Messages for selected thread ── */
  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ["support-messages", selectedThread],
    queryFn: async () => {
      const { data } = await supabase
        .from("support_messages")
        .select("id, sender_id, sender_type, content, created_at")
        .eq("thread_id", selectedThread!)
        .order("created_at");
      return data ?? [];
    },
    enabled: !!selectedThread,
  });

  /* ── Real-time subscription ── */
  useEffect(() => {
    if (!selectedThread) return;
    const channel = supabase
      .channel(`support:${selectedThread}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "support_messages",
          filter: `thread_id=eq.${selectedThread}`,
        },
        () => {
          queryClient.invalidateQueries({
            queryKey: ["support-messages", selectedThread],
          });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedThread, queryClient]);

  /* ── Auto-scroll on new messages ── */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ── Create thread ── */
  async function handleCreateThread() {
    if (!user || !newSubject.trim() || !newMessage.trim()) return;
    setCreating(true);
    try {
      const { data: thread, error } = await supabase
        .from("support_threads")
        .insert({ user_id: user.id, subject: newSubject.trim() })
        .select("id")
        .single();

      if (error || !thread) {
        toast.error("Failed to create thread");
        return;
      }

      await supabase.from("support_messages").insert({
        thread_id: thread.id,
        sender_id: user.id,
        sender_type: "user",
        content: newMessage.trim(),
      });

      notifyAdmins({
        type: "support_new",
        title: "New support request",
        message: `${userName}: ${newSubject.trim()}`,
        link: `/admin/inbox?thread=${thread.id}`,
      });

      queryClient.invalidateQueries({ queryKey: ["support-threads"] });
      setDialogOpen(false);
      setNewSubject("");
      setNewMessage("");
      setSelectedThread(thread.id);
      toast.success("Support request created");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setCreating(false);
    }
  }

  /* ── Send reply ── */
  async function handleSendReply() {
    if (!user || !selectedThread || !replyText.trim()) return;
    setSending(true);
    try {
      await supabase.from("support_messages").insert({
        thread_id: selectedThread,
        sender_id: user.id,
        sender_type: "user",
        content: replyText.trim(),
      });

      await supabase
        .from("support_threads")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", selectedThread);

      const currentThread = threads.find((t) => t.id === selectedThread);
      notifyAdmins({
        type: "support_user_reply",
        title: "New support reply",
        message: `${userName} replied to "${currentThread?.subject ?? "thread"}"`,
        link: `/admin/inbox?thread=${selectedThread}`,
      });

      queryClient.invalidateQueries({
        queryKey: ["support-messages", selectedThread],
      });
      queryClient.invalidateQueries({ queryKey: ["support-threads"] });
      setReplyText("");
    } catch {
      toast.error("Failed to send reply");
    } finally {
      setSending(false);
    }
  }

  const currentThread = threads.find((t) => t.id === selectedThread);

  /* ── Conversation view ── */
  if (selectedThread) {
    return (
      <div className="mx-auto max-w-3xl animate-fade-in">
        <button
          onClick={() => setSelectedThread(null)}
          className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to threads
        </button>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
            <CardTitle className="text-lg font-semibold truncate">
              {currentThread?.subject ?? "Thread"}
            </CardTitle>
            {currentThread && (
              <StatusBadge status={currentThread.status} />
            )}
          </CardHeader>

          <CardContent className="space-y-0 p-0">
            {/* Messages */}
            <div className="max-h-[60vh] overflow-y-auto px-6 py-4 space-y-3">
              {messages.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No messages yet.
                </p>
              )}
              {messages.map((msg, i) => {
                const isUser = msg.sender_type === "user";
                return (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex animate-fade-in",
                      isUser ? "justify-end" : "justify-start",
                    )}
                    style={{ animationDelay: `${i * 30}ms` }}
                  >
                    <div
                      className={cn(
                        "rounded-md px-3.5 py-2.5 text-sm max-w-[80%]",
                        isUser
                          ? "bg-primary text-primary-foreground ml-auto"
                          : "bg-muted",
                      )}
                    >
                      <p className="whitespace-pre-wrap break-words">
                        {msg.content}
                      </p>
                      <p
                        className={cn(
                          "mt-1.5 text-[11px]",
                          isUser
                            ? "text-primary-foreground/60"
                            : "text-muted-foreground",
                        )}
                      >
                        {format(new Date(msg.created_at), "MMM d, h:mm a")}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply input */}
            <div className="border-t px-6 py-4 flex gap-2">
              <Textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Type your reply..."
                className="min-h-[44px] max-h-32 resize-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !sending) {
                    e.preventDefault();
                    handleSendReply();
                  }
                }}
              />
              <Button
                onClick={handleSendReply}
                disabled={sending || !replyText.trim()}
                size="icon"
                className="shrink-0 h-11 w-11"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ── Thread list view ── */
  return (
    <div className="mx-auto max-w-3xl animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Support</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Get help from the BossBoard team.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} size="sm">
          <Plus className="h-4 w-4 mr-1.5" />
          New Request
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-[72px] rounded-md border bg-muted/40 animate-pulse"
            />
          ))}
        </div>
      ) : threads.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <MessageCircle className="h-10 w-10 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">
              No support threads yet. Create one to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2 stagger-children">
          {threads.map((thread) => (
            <button
              key={thread.id}
              onClick={() => setSelectedThread(thread.id)}
              className="w-full text-left rounded-md border bg-card px-4 py-3 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium text-sm truncate">
                  {thread.subject}
                </span>
                <StatusBadge status={thread.status} />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Updated {format(new Date(thread.updated_at), "MMM d, h:mm a")}
              </p>
            </button>
          ))}
        </div>
      )}

      {/* New Request Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Support Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Subject</label>
              <Input
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                placeholder="Brief summary of your issue"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Message</label>
              <Textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Describe what you need help with..."
                className="min-h-[120px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateThread}
              disabled={creating || !newSubject.trim() || !newMessage.trim()}
            >
              {creating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              ) : null}
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] ?? statusConfig.open;
  return (
    <Badge variant="outline" className={cn("text-[11px] shrink-0", config.className)}>
      {config.label}
    </Badge>
  );
}
