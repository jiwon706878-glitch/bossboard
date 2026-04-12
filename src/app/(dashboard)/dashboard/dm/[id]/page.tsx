"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Bot, User, Send } from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface ParticipantProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  account_type: "human" | "agent";
  agent_role: string | null;
}

interface Conversation {
  id: string;
  is_group: boolean;
  title: string | null;
  last_message_at: string;
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

// ─── Helpers ────────────────────────────────────────────────────────────────

function timeOfDay(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function DmThreadPage() {
  const params = useParams<{ id: string }>();
  const conversationId = params.id;
  const supabase = createClient();

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [composer, setComposer] = useState("");
  const [sending, setSending] = useState(false);
  const [myUserId, setMyUserId] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  // ─── Load conversation metadata ─────────────────────────────────
  const loadConversation = useCallback(async () => {
    const res = await fetch(`/api/dm/conversations/${conversationId}`, {
      cache: "no-store",
    });
    if (!res.ok) {
      toast.error("Conversation not found");
      return;
    }
    const data = await res.json();
    setConversation(data.conversation);
  }, [conversationId]);

  // ─── Load messages ──────────────────────────────────────────────
  const loadMessages = useCallback(async () => {
    const res = await fetch(
      `/api/dm/conversations/${conversationId}/messages?limit=100`,
      { cache: "no-store" }
    );
    if (!res.ok) return;
    const data = await res.json();
    setMessages(data.messages ?? []);
    setLoading(false);
  }, [conversationId]);

  // ─── Mark as read (idempotent, fire-and-forget) ────────────────
  const markRead = useCallback(async () => {
    fetch(`/api/dm/conversations/${conversationId}/read`, {
      method: "POST",
    }).catch(() => {});
  }, [conversationId]);

  // ─── Initial load + identity ───────────────────────────────────
  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setMyUserId(user?.id ?? null);
    })();
    loadConversation();
    loadMessages();
  }, [loadConversation, loadMessages, supabase]);

  // ─── Polling refresh + read mark ───────────────────────────────
  // Same 5s polling pattern as the list page. Whenever new messages
  // arrive while the user is on this thread, the unread badge on the
  // list page goes away because we mark-read on every poll.
  useEffect(() => {
    markRead();
    const t = setInterval(() => {
      loadMessages();
      markRead();
    }, 5000);
    return () => clearInterval(t);
  }, [loadMessages, markRead]);

  // ─── Auto-scroll to bottom on new messages ─────────────────────
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  // ─── Send message ──────────────────────────────────────────────
  async function handleSend(e?: React.FormEvent) {
    e?.preventDefault();
    const content = composer.trim();
    if (!content || sending) return;
    setSending(true);
    // Optimistic clear so the input feels responsive
    setComposer("");
    try {
      const res = await fetch(
        `/api/dm/conversations/${conversationId}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Failed to send");
        // Restore the draft so the user doesn't lose it
        setComposer(content);
        return;
      }
      // Refresh immediately so the new message appears without
      // waiting for the next poll tick.
      await loadMessages();
    } catch {
      toast.error("Failed to send");
      setComposer(content);
    } finally {
      setSending(false);
    }
  }

  const otherParticipants = (conversation?.dm_participants ?? []).filter(
    (p) => p.profile_id !== myUserId
  );
  const headerTitle = conversation?.title
    ? conversation.title
    : otherParticipants
        .map((p) => p.profiles?.full_name ?? "Unknown")
        .join(", ") || "Conversation";

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-[900px] mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b">
        <Link
          href="/dashboard/dm"
          className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold truncate">{headerTitle}</h1>
          {conversation && (
            <p className="text-xs text-muted-foreground">
              {conversation.dm_participants.length} participant
              {conversation.dm_participants.length === 1 ? "" : "s"}
            </p>
          )}
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto py-4 space-y-3"
      >
        {loading ? (
          <p className="text-center text-sm text-muted-foreground py-10">
            Loading messages...
          </p>
        ) : messages.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No messages yet. Send the first one below.
            </CardContent>
          </Card>
        ) : (
          messages.map((m) => {
            const isMine = m.sender_id === myUserId;
            const isAgent = m.sender?.account_type === "agent";
            return (
              <div
                key={m.id}
                className={`flex gap-3 ${isMine ? "flex-row-reverse" : ""}`}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted shrink-0">
                  {isAgent ? (
                    <Bot className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <User className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <div
                  className={`max-w-[70%] flex flex-col ${
                    isMine ? "items-end" : "items-start"
                  }`}
                >
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-0.5">
                    <span className="font-medium text-foreground">
                      {m.sender?.full_name ?? "Unknown"}
                    </span>
                    <span>{timeOfDay(m.created_at)}</span>
                  </div>
                  <div
                    className={`rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                      isMine
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Composer */}
      <form
        onSubmit={handleSend}
        className="flex gap-2 pt-3 border-t"
      >
        <Input
          value={composer}
          onChange={(e) => setComposer(e.target.value)}
          placeholder="Type a message..."
          disabled={sending}
          maxLength={10000}
          autoFocus
        />
        <Button type="submit" disabled={sending || !composer.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
