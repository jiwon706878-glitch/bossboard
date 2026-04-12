"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useBusinessStore } from "@/hooks/use-business";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MessageSquare, Plus, Bot, User, ArrowRight } from "lucide-react";

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

// Profile rows we can DM with — humans (other team members + myself's
// agents). For Day 6 we only target agents the user owns; expanding
// to all team humans is a later task.
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
  if (diff < 60_000) return "just now";
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3600_000)}h`;
  return `${Math.floor(diff / 86_400_000)}d`;
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
  return others
    .slice(0, 3)
    .map((p) => p.profiles?.full_name ?? "Unknown")
    .join(", ") + (others.length > 3 ? ` +${others.length - 3}` : "");
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function DmListPage() {
  const supabase = createClient();
  const currentBusiness = useBusinessStore((s) => s.currentBusiness);
  const businessId = currentBusiness?.id;

  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [myProfileIds, setMyProfileIds] = useState<Set<string>>(new Set());

  // "Start new" dialog state
  const [newOpen, setNewOpen] = useState(false);
  const [targets, setTargets] = useState<DmTarget[]>([]);
  const [creating, setCreating] = useState(false);

  // ─── Load conversations ─────────────────────────────────────────
  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/dm/conversations", { cache: "no-store" });
      if (!res.ok) {
        toast.error("Failed to load conversations");
        return;
      }
      const data = await res.json();
      setConversations(data.conversations ?? []);
    } catch {
      toast.error("Failed to load conversations");
    } finally {
      setLoading(false);
    }
  }, []);

  // Resolve "my" profile ids (self + agents I own) so the title
  // helper can hide them when picking the counterpart name.
  const loadMyProfileIds = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("id")
      .or(`id.eq.${user.id},parent_user_id.eq.${user.id}`);
    const ids = ((data ?? []) as Array<{ id: string }>).map((r) => r.id);
    setMyProfileIds(new Set(ids));
  }, [supabase]);

  useEffect(() => {
    loadMyProfileIds();
    loadConversations();
  }, [loadMyProfileIds, loadConversations]);

  // Polling refresh — Day 6 doesn't use Supabase Realtime yet (no
  // precedent in this codebase, would risk subscription leaks). 5s
  // is gentle enough that the unread badges feel live without
  // hammering the API.
  useEffect(() => {
    const t = setInterval(loadConversations, 5000);
    return () => clearInterval(t);
  }, [loadConversations]);

  // ─── New DM dialog: load possible targets ───────────────────────
  useEffect(() => {
    if (!newOpen || !businessId) return;
    let cancelled = false;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Targets: humans on the same business (excluding self) + AI
      // agents the current user owns. Pulled in two queries so we
      // don't need a complex join.
      const [{ data: members }, { data: ownedAgents }] = await Promise.all([
        supabase
          .from("business_members")
          .select(
            `
              user_id,
              profiles:user_id (
                id,
                full_name,
                avatar_url,
                account_type,
                agent_role
              )
            `
          )
          .eq("business_id", businessId),
        supabase
          .from("profiles")
          .select("id, full_name, avatar_url, account_type, agent_role")
          .eq("parent_user_id", user.id)
          .eq("account_type", "agent"),
      ]);

      const humanRows: DmTarget[] = [];
      for (const row of (members ?? []) as Array<{
        user_id: string;
        profiles: DmTarget | null;
      }>) {
        if (row.user_id === user.id) continue; // skip self
        if (row.profiles) humanRows.push(row.profiles);
      }
      const agentRows: DmTarget[] = (ownedAgents ?? []) as DmTarget[];

      if (!cancelled) {
        setTargets([...humanRows, ...agentRows]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [newOpen, businessId, supabase]);

  async function startConversation(targetId: string) {
    setCreating(true);
    try {
      const res = await fetch("/api/dm/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participant_ids: [targetId] }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to start conversation");
        return;
      }
      // Navigate via Link semantics
      window.location.href = `/dashboard/dm/${data.conversation_id}`;
    } catch {
      toast.error("Failed to start conversation");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <MessageSquare className="h-7 w-7" /> Direct Messages
          </h1>
          <p className="text-muted-foreground mt-1">
            One-on-one conversations with humans and AI agents.
          </p>
        </div>
        <Button onClick={() => setNewOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New conversation
        </Button>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Loading...
          </CardContent>
        </Card>
      ) : conversations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MessageSquare className="h-10 w-10 mx-auto text-muted-foreground" />
            <h3 className="mt-4 font-semibold">No conversations yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Start a DM with a teammate or one of your AI agents.
            </p>
            <Button
              className="mt-4"
              size="sm"
              onClick={() => setNewOpen(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              New conversation
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {conversations.map((conv) => (
            <Link
              key={conv.id}
              href={`/dashboard/dm/${conv.id}`}
              className="block"
            >
              <Card
                className={`transition-colors hover:border-primary/50 ${
                  conv.unread ? "border-primary/50" : ""
                }`}
              >
                <CardContent className="py-3 flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted shrink-0">
                    {conv.dm_participants.some(
                      (p) =>
                        !myProfileIds.has(p.profile_id) &&
                        p.profiles?.account_type === "agent"
                    ) ? (
                      <Bot className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <User className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold truncate">
                        {conversationTitle(conv, myProfileIds)}
                      </h3>
                      {conv.unread && (
                        <Badge variant="default" className="text-[10px] px-1.5 py-0">
                          New
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {relativeTime(conv.last_message_at)} ago
                      {conv.is_group && " · group"}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Start a new conversation</DialogTitle>
            <DialogDescription>
              Pick a teammate or one of your AI agents to message.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2 max-h-80 overflow-y-auto">
            {targets.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No targets available — invite a teammate or create an agent
                first.
              </p>
            ) : (
              targets.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => startConversation(t.id)}
                  disabled={creating}
                  className="w-full flex items-center gap-3 rounded-md border p-3 text-left transition-colors hover:bg-muted disabled:opacity-50"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted shrink-0">
                    {t.account_type === "agent" ? (
                      <Bot className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <User className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {t.full_name || "Unnamed"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {t.account_type === "agent"
                        ? t.agent_role || "Agent"
                        : "Team member"}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setNewOpen(false)}
              disabled={creating}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
