"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createNotification } from "@/lib/notifications";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Send,
  Loader2,
  MessageCircle,
  Inbox,
  CheckCircle,
  Clock,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

type Thread = {
  id: string;
  user_id: string;
  subject: string;
  status: string;
  created_at: string;
  updated_at: string;
};

type Message = {
  id: string;
  sender_id: string;
  sender_type: string;
  content: string;
  created_at: string;
};

const STATUS_FILTERS = ["all", "open", "in_progress", "resolved"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

const STATUS_LABELS: Record<string, string> = {
  all: "All",
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved",
};

const STATUS_BADGE_CLASSES: Record<string, string> = {
  open: "bg-blue-500/10 text-blue-600",
  in_progress: "bg-amber-500/10 text-amber-600",
  resolved: "bg-green-500/10 text-green-600",
};

export default function AdminInboxPage() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ---- Threads query ----
  const { data: threads = [], isLoading: threadsLoading } = useQuery({
    queryKey: ["admin-threads"],
    queryFn: async () => {
      const { data } = await supabase
        .from("support_threads")
        .select("id, user_id, subject, status, created_at, updated_at")
        .order("updated_at", { ascending: false });
      return (data ?? []) as Thread[];
    },
  });

  // ---- User profiles for thread authors ----
  const userIds = useMemo(
    () => [...new Set(threads.map((t) => t.user_id))],
    [threads],
  );

  const { data: nameMap = new Map<string, string>() } = useQuery<Map<string, string>>({
    queryKey: ["admin-thread-profiles", userIds],
    queryFn: async () => {
      if (userIds.length === 0) return new Map<string, string>();
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);
      return new Map<string, string>(
        (profiles ?? []).map((p: { id: string; full_name: string }) => [
          p.id,
          p.full_name,
        ]),
      );
    },
    enabled: userIds.length > 0,
  });

  // ---- Messages query ----
  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ["admin-messages", selectedThread],
    queryFn: async () => {
      const { data } = await supabase
        .from("support_messages")
        .select("id, sender_id, sender_type, content, created_at")
        .eq("thread_id", selectedThread!)
        .order("created_at");
      return (data ?? []) as Message[];
    },
    enabled: !!selectedThread,
  });

  // ---- Realtime subscription ----
  useEffect(() => {
    const channel = supabase
      .channel("admin-inbox-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "support_messages" },
        () => {
          if (selectedThread) {
            queryClient.invalidateQueries({
              queryKey: ["admin-messages", selectedThread],
            });
          }
          queryClient.invalidateQueries({ queryKey: ["admin-threads"] });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "support_threads" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["admin-threads"] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, queryClient, selectedThread]);

  // ---- Scroll to bottom on new messages ----
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ---- Filtered threads ----
  const filteredThreads = useMemo(() => {
    let result = threads;
    if (filter !== "all") {
      result = result.filter((t) => t.status === filter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.subject.toLowerCase().includes(q) ||
          (nameMap.get(t.user_id) ?? "").toLowerCase().includes(q),
      );
    }
    return result;
  }, [threads, filter, search, nameMap]);

  const activeThread = threads.find((t) => t.id === selectedThread);

  // ---- Admin reply ----
  async function handleAdminReply() {
    if (!replyText.trim() || !selectedThread) return;
    setSending(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      await supabase.from("support_messages").insert({
        thread_id: selectedThread,
        sender_id: user!.id,
        sender_type: "admin",
        content: replyText.trim(),
      });
      await supabase
        .from("support_threads")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", selectedThread);

      // Notify the thread owner
      const thread = threads.find((t) => t.id === selectedThread);
      if (thread) {
        createNotification({
          userId: thread.user_id,
          type: "support_reply",
          title: "Support reply",
          message: `Admin replied to "${thread.subject}"`,
          link: `/dashboard/support?thread=${selectedThread}`,
        });
      }

      setReplyText("");
      queryClient.invalidateQueries({
        queryKey: ["admin-messages", selectedThread],
      });
      queryClient.invalidateQueries({ queryKey: ["admin-threads"] });
    } catch {
      toast.error("Failed to send reply");
    } finally {
      setSending(false);
    }
  }

  // ---- Status change ----
  async function handleStatusChange(threadId: string, status: string) {
    await supabase
      .from("support_threads")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", threadId);
    toast.success(`Marked as ${status.replace("_", " ")}`);
    queryClient.invalidateQueries({ queryKey: ["admin-threads"] });
  }

  // ---- Relative time helper ----
  function relativeTime(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return format(new Date(dateStr), "MMM d");
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold">Inbox</h1>
        <p className="text-muted-foreground">
          {threads.length} thread{threads.length !== 1 ? "s" : ""} total
        </p>
      </div>

      <div className="flex flex-col lg:flex-row border rounded-md overflow-hidden bg-background min-h-[calc(100vh-12rem)]">
        {/* ---- Left pane: thread list ---- */}
        <div className="w-full lg:w-80 xl:w-96 border-b lg:border-b-0 lg:border-r flex flex-col shrink-0">
          {/* Filter tabs */}
          <div className="flex border-b px-2 pt-2 gap-1">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-t-md transition-colors",
                  filter === f
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {STATUS_LABELS[f]}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by subject..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9 text-sm"
              />
            </div>
          </div>

          {/* Thread list */}
          <div className="flex-1 overflow-y-auto">
            {threadsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : filteredThreads.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground text-sm">
                <MessageCircle className="h-8 w-8 mb-2 opacity-40" />
                <span>No threads found</span>
              </div>
            ) : (
              filteredThreads.map((thread) => (
                <button
                  key={thread.id}
                  onClick={() => setSelectedThread(thread.id)}
                  className={cn(
                    "w-full text-left px-4 py-3 border-b transition-colors hover:bg-muted/50",
                    selectedThread === thread.id && "bg-muted",
                  )}
                >
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className="text-xs text-muted-foreground truncate">
                      {nameMap.get(thread.user_id) ?? "Unknown user"}
                    </span>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {relativeTime(thread.updated_at)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium truncate">
                      {thread.subject}
                    </span>
                    <Badge
                      variant="ghost"
                      className={cn(
                        "text-[10px] px-1.5 py-0 shrink-0 rounded-sm",
                        STATUS_BADGE_CLASSES[thread.status] ?? "",
                      )}
                    >
                      {thread.status.replace("_", " ")}
                    </Badge>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* ---- Right pane: conversation ---- */}
        <div className="flex-1 flex flex-col min-w-0">
          {!selectedThread ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
              <Inbox className="h-12 w-12 mb-3 opacity-30" />
              <span className="text-sm">
                Select a thread to view conversation
              </span>
            </div>
          ) : (
            <>
              {/* Conversation header */}
              <div className="flex items-center justify-between gap-3 px-4 py-3 border-b">
                <div className="min-w-0">
                  <h2 className="text-base font-semibold truncate">
                    {activeThread?.subject}
                  </h2>
                  <span className="text-xs text-muted-foreground">
                    {nameMap.get(activeThread?.user_id ?? "") ?? "Unknown user"}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {activeThread && (
                    <Badge
                      variant="ghost"
                      className={cn(
                        "text-xs px-2 py-0.5 rounded-sm",
                        STATUS_BADGE_CLASSES[activeThread.status] ?? "",
                      )}
                    >
                      {activeThread.status.replace("_", " ")}
                    </Badge>
                  )}
                  {activeThread?.status !== "in_progress" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handleStatusChange(selectedThread, "in_progress")
                      }
                    >
                      <Clock className="h-3.5 w-3.5 mr-1" />
                      In Progress
                    </Button>
                  )}
                  {activeThread?.status !== "resolved" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handleStatusChange(selectedThread, "resolved")
                      }
                    >
                      <CheckCircle className="h-3.5 w-3.5 mr-1" />
                      Resolved
                    </Button>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                {messagesLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center text-muted-foreground text-sm py-12">
                    No messages yet
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isAdmin = msg.sender_type === "admin";
                    return (
                      <div
                        key={msg.id}
                        className={cn(
                          "flex",
                          isAdmin ? "justify-end" : "justify-start",
                        )}
                      >
                        <div
                          className={cn(
                            "max-w-[75%] rounded-md px-3 py-2 text-sm",
                            isAdmin
                              ? "bg-blue-600 text-white"
                              : "bg-muted text-foreground",
                          )}
                        >
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                          <p
                            className={cn(
                              "text-[10px] mt-1",
                              isAdmin
                                ? "text-blue-200"
                                : "text-muted-foreground",
                            )}
                          >
                            {format(new Date(msg.created_at), "MMM d, h:mm a")}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply input */}
              <div className="border-t px-4 py-3 flex gap-2">
                <Textarea
                  placeholder="Type your reply..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      handleAdminReply();
                    }
                  }}
                  className="min-h-[2.5rem] max-h-32 resize-none text-sm"
                  rows={2}
                />
                <Button
                  size="sm"
                  onClick={handleAdminReply}
                  disabled={!replyText.trim() || sending}
                  className="self-end shrink-0"
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
