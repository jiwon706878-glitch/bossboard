"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useBusinessStore } from "@/hooks/use-business";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  X,
  ArrowLeft,
  Bot,
  User,
  Send,
  Plus,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";

// ─── Types ──────────────────────────────────────────────────────────────────

interface ParticipantProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  account_type: "human" | "agent";
  agent_role: string | null;
}

interface ConversationListItem {
  id: string;
  is_group: boolean;
  title: string | null;
  last_message_at: string;
  unread: boolean;
  dm_participants: Array<{
    profile_id: string;
    last_read_at: string;
    profiles: ParticipantProfile;
  }>;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  content: string;
  created_at: string;
  sender: ParticipantProfile | null;
}

interface DmTarget {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  account_type: "human" | "agent";
  agent_role: string | null;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return "now";
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3600_000)}h`;
  return `${Math.floor(diff / 86_400_000)}d`;
}

function timeOfDay(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function conversationTitle(
  conv: ConversationListItem,
  myProfileIds: Set<string>
): string {
  if (conv.title) return conv.title;
  const others = conv.dm_participants.filter(
    (p) => !myProfileIds.has(p.profile_id)
  );
  if (others.length === 0) return "Just you";
  if (others.length === 1) return others[0].profiles?.full_name ?? "Unknown";
  return (
    others
      .slice(0, 3)
      .map((p) => p.profiles?.full_name ?? "Unknown")
      .join(", ") + (others.length > 3 ? ` +${others.length - 3}` : "")
  );
}

// ─── Props ──────────────────────────────────────────────────────────────────

interface DmSidePanelProps {
  open: boolean;
  onClose: () => void;
  /** If set, opens directly to this conversation */
  conversationId?: string | null;
  /** If set, opens a new conversation with this user/agent */
  targetId?: string | null;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function DmSidePanel({
  open,
  onClose,
  conversationId: initialConversationId,
  targetId,
}: DmSidePanelProps) {
  const supabase = createClient();
  const currentBusiness = useBusinessStore((s) => s.currentBusiness);
  const businessId = currentBusiness?.id;

  // View state: "list" | "thread" | "new"
  const [view, setView] = useState<"list" | "thread" | "new">("list");
  const [activeConvId, setActiveConvId] = useState<string | null>(null);

  // List state
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [myProfileIds, setMyProfileIds] = useState<Set<string>>(new Set());
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [listLoading, setListLoading] = useState(true);

  // Thread state
  const [messages, setMessages] = useState<Message[]>([]);
  const [threadConv, setThreadConv] = useState<ConversationListItem | null>(null);
  const [composer, setComposer] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // New conversation state
  const [targets, setTargets] = useState<DmTarget[]>([]);
  const [creating, setCreating] = useState(false);

  // ─── Init ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setMyUserId(user.id);
      const { data } = await supabase
        .from("profiles")
        .select("id")
        .or(`id.eq.${user.id},parent_user_id.eq.${user.id}`);
      setMyProfileIds(new Set((data ?? []).map((r: { id: string }) => r.id)));
    })();
  }, [open, supabase]);

  // Handle initial props
  useEffect(() => {
    if (!open) return;
    if (initialConversationId) {
      setActiveConvId(initialConversationId);
      setView("thread");
    } else if (targetId) {
      handleStartConversation(targetId);
    } else {
      setView("list");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialConversationId, targetId]);

  // ─── List loading ───────────────────────────────────────────────
  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/dm/conversations", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setConversations(data.conversations ?? []);
    } catch {
      // silent
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open || view !== "list") return;
    loadConversations();
    const t = setInterval(loadConversations, 5000);
    return () => clearInterval(t);
  }, [open, view, loadConversations]);

  // ─── Thread loading ─────────────────────────────────────────────
  const loadMessages = useCallback(async () => {
    if (!activeConvId) return;
    try {
      const res = await fetch(
        `/api/dm/conversations/${activeConvId}/messages?limit=100`,
        { cache: "no-store" }
      );
      if (!res.ok) return;
      const data = await res.json();
      setMessages(data.messages ?? []);
    } catch {
      // silent
    }
  }, [activeConvId]);

  const loadThreadConv = useCallback(async () => {
    if (!activeConvId) return;
    try {
      const res = await fetch(`/api/dm/conversations/${activeConvId}`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = await res.json();
      setThreadConv(data.conversation);
    } catch {
      // silent
    }
  }, [activeConvId]);

  useEffect(() => {
    if (!open || view !== "thread" || !activeConvId) return;
    loadThreadConv();
    loadMessages();
    // Mark read
    fetch(`/api/dm/conversations/${activeConvId}/read`, { method: "POST" }).catch(() => {});
    const t = setInterval(() => {
      loadMessages();
      fetch(`/api/dm/conversations/${activeConvId}/read`, { method: "POST" }).catch(() => {});
    }, 5000);
    return () => clearInterval(t);
  }, [open, view, activeConvId, loadMessages, loadThreadConv]);

  // Auto-scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  // ─── New conversation targets ───────────────────────────────────
  useEffect(() => {
    if (!open || view !== "new" || !businessId) return;
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [{ data: members }, { data: ownedAgents }] = await Promise.all([
        supabase
          .from("business_members")
          .select("user_id, profiles:user_id (id, full_name, avatar_url, account_type, agent_role)")
          .eq("business_id", businessId),
        supabase
          .from("profiles")
          .select("id, full_name, avatar_url, account_type, agent_role")
          .eq("parent_user_id", user.id)
          .eq("account_type", "agent"),
      ]);
      const humanRows: DmTarget[] = [];
      for (const row of (members ?? []) as Array<{ user_id: string; profiles: DmTarget | null }>) {
        if (row.user_id === user.id) continue;
        if (row.profiles) humanRows.push(row.profiles);
      }
      if (!cancelled) setTargets([...humanRows, ...((ownedAgents ?? []) as DmTarget[])]);
    })();
    return () => { cancelled = true; };
  }, [open, view, businessId, supabase]);

  // ─── Actions ────────────────────────────────────────────────────
  async function handleSend(e?: React.FormEvent) {
    e?.preventDefault();
    const content = composer.trim();
    if (!content || sending || !activeConvId) return;
    setSending(true);
    setComposer("");
    try {
      const res = await fetch(`/api/dm/conversations/${activeConvId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) {
        toast.error("Failed to send");
        setComposer(content);
        return;
      }
      await loadMessages();
    } catch {
      toast.error("Failed to send");
      setComposer(content);
    } finally {
      setSending(false);
    }
  }

  async function handleStartConversation(tId: string) {
    setCreating(true);
    try {
      const res = await fetch("/api/dm/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participant_ids: [tId] }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to start conversation");
        return;
      }
      setActiveConvId(data.conversation_id);
      setView("thread");
    } catch {
      toast.error("Failed to start conversation");
    } finally {
      setCreating(false);
    }
  }

  function openConversation(id: string) {
    setActiveConvId(id);
    setMessages([]);
    setThreadConv(null);
    setView("thread");
  }

  // ─── Reset on close ─────────────────────────────────────────────
  useEffect(() => {
    if (!open) {
      setView("list");
      setActiveConvId(null);
      setMessages([]);
      setThreadConv(null);
      setComposer("");
      setListLoading(true);
    }
  }, [open]);

  // Thread header
  const otherParticipants = (threadConv?.dm_participants ?? []).filter(
    (p) => p.profile_id !== myUserId
  );
  const threadTitle = threadConv?.title
    ? threadConv.title
    : otherParticipants.map((p) => p.profiles?.full_name ?? "Unknown").join(", ") || "Conversation";

  // ─── Render ─────────────────────────────────────────────────────
  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div
        className={cn(
          "fixed top-0 right-0 z-50 h-full w-full sm:w-[400px] bg-card border-l border-border shadow-xl flex flex-col transition-transform duration-200",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b">
          {view === "thread" ? (
            <button
              type="button"
              onClick={() => setView("list")}
              className="p-1 rounded hover:bg-muted transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          ) : (
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          )}
          <h2 className="flex-1 text-sm font-semibold truncate">
            {view === "thread" ? threadTitle : view === "new" ? "New conversation" : "Messages"}
          </h2>
          {view === "list" && (
            <button
              type="button"
              onClick={() => setView("new")}
              className="p-1 rounded hover:bg-muted transition-colors"
              title="New conversation"
            >
              <Plus className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── List view ─────────────────────────────────────────── */}
        {view === "list" && (
          <div className="flex-1 overflow-y-auto">
            {listLoading ? (
              <div className="space-y-2 p-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-14 animate-pulse rounded-md bg-muted" />
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                <MessageSquare className="h-8 w-8 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">No conversations yet</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3 gap-1"
                  onClick={() => setView("new")}
                >
                  <Plus className="h-3 w-3" />
                  Start one
                </Button>
              </div>
            ) : (
              conversations.map((conv) => {
                const isAgent = conv.dm_participants.some(
                  (p) => !myProfileIds.has(p.profile_id) && p.profiles?.account_type === "agent"
                );
                return (
                  <button
                    key={conv.id}
                    type="button"
                    onClick={() => openConversation(conv.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50",
                      conv.unread && "bg-primary/5"
                    )}
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted shrink-0">
                      {isAgent ? <Bot className="h-4 w-4 text-muted-foreground" /> : <User className="h-4 w-4 text-muted-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className={cn("text-sm truncate", conv.unread && "font-semibold")}>
                          {conversationTitle(conv, myProfileIds)}
                        </p>
                        <span className="text-[10px] text-muted-foreground ml-2 shrink-0">
                          {relativeTime(conv.last_message_at)}
                        </span>
                      </div>
                    </div>
                    {conv.unread && (
                      <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        )}

        {/* ── New conversation view ─────────────────────────────── */}
        {view === "new" && (
          <div className="flex-1 overflow-y-auto p-3">
            {targets.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No targets available
              </p>
            ) : (
              <div className="space-y-1">
                {targets.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleStartConversation(t.id)}
                    disabled={creating}
                    className="w-full flex items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors hover:bg-muted disabled:opacity-50"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted shrink-0">
                      {t.account_type === "agent" ? <Bot className="h-4 w-4 text-muted-foreground" /> : <User className="h-4 w-4 text-muted-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{t.full_name || "Unnamed"}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {t.account_type === "agent" ? t.agent_role || "Agent" : "Team member"}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Thread view ───────────────────────────────────────── */}
        {view === "thread" && (
          <>
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {messages.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-10">
                  No messages yet. Send the first one below.
                </p>
              ) : (
                messages.map((m) => {
                  const isMine = m.sender_id === myUserId;
                  const isAgent = m.sender?.account_type === "agent";
                  return (
                    <div key={m.id} className={`flex gap-2 ${isMine ? "flex-row-reverse" : ""}`}>
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted shrink-0">
                        {isAgent ? <Bot className="h-3.5 w-3.5 text-muted-foreground" /> : <User className="h-3.5 w-3.5 text-muted-foreground" />}
                      </div>
                      <div className={`max-w-[75%] flex flex-col ${isMine ? "items-end" : "items-start"}`}>
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-0.5">
                          <span className="font-medium text-foreground">{m.sender?.full_name ?? "Unknown"}</span>
                          <span>{timeOfDay(m.created_at)}</span>
                        </div>
                        <div className={cn(
                          "rounded-lg px-3 py-1.5 text-sm whitespace-pre-wrap",
                          isMine ? "bg-primary text-primary-foreground" : "bg-muted"
                        )}>
                          {m.content}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <form onSubmit={handleSend} className="flex gap-2 px-4 py-3 border-t">
              <Input
                value={composer}
                onChange={(e) => setComposer(e.target.value)}
                placeholder="Type a message..."
                disabled={sending}
                maxLength={10000}
                autoFocus
                className="h-9 text-sm"
              />
              <Button type="submit" size="sm" disabled={sending || !composer.trim()} className="h-9 px-3">
                <Send className="h-3.5 w-3.5" />
              </Button>
            </form>
          </>
        )}
      </div>
    </>
  );
}
