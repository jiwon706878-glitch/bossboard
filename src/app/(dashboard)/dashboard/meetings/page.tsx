"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useBusinessStore } from "@/hooks/use-business";
import { userKeys, fetchCurrentUser } from "@/lib/queries";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Users, Plus, Play, Check, X, Bot, MessageSquare } from "lucide-react";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Meeting {
  id: string;
  title: string;
  topic: string;
  status: "draft" | "in_progress" | "completed" | "approved" | "rejected";
  created_by: string;
  conclusion: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
  participant_count: number;
}

interface MeetingMessage {
  id: string;
  sender_id: string;
  content: string;
  message_order: number;
  created_at: string;
}

interface MeetingParticipant {
  id: string;
  profile_id: string;
  role: string;
  profiles: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    agent_role: string | null;
  } | null;
}

interface Agent {
  id: string;
  full_name: string;
  avatar_url: string | null;
  agent_role: string | null;
}

// ─── Status badge config ─────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  Meeting["status"],
  { label: string; className: string }
> = {
  draft: {
    label: "Draft",
    className: "bg-text-tertiary/20 text-text-secondary",
  },
  in_progress: {
    label: "In Progress",
    className: "bg-blue-500/20 text-blue-400",
  },
  completed: {
    label: "Completed",
    className: "bg-green-500/20 text-green-400",
  },
  approved: {
    label: "Approved",
    className: "bg-emerald-500/20 text-emerald-400",
  },
  rejected: {
    label: "Rejected",
    className: "bg-red-500/20 text-red-400",
  },
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function MeetingsPage() {
  const queryClient = useQueryClient();
  const currentBusiness = useBusinessStore((s) => s.currentBusiness);
  const businessId = currentBusiness?.id;

  const { data: currentUser } = useQuery({
    queryKey: userKeys.current,
    queryFn: fetchCurrentUser,
    retry: false,
  });
  const userId = currentUser?.id ?? null;

  // ── Meetings list ──────────────────────────────────────────────────────────
  const {
    data: meetings = [],
    isLoading: meetingsLoading,
    refetch: refetchMeetings,
  } = useQuery({
    queryKey: ["meetings", businessId],
    queryFn: async () => {
      if (!businessId) return [];
      const res = await fetch(`/api/meetings?business_id=${businessId}`);
      if (!res.ok) return [];
      const json = await res.json();
      return (json.meetings ?? []) as Meeting[];
    },
    enabled: !!businessId,
    staleTime: 30_000,
  });

  // ── Agents list (for new meeting dialog) ───────────────────────────────────
  const { data: agents = [] } = useQuery({
    queryKey: ["agents-list"],
    queryFn: async () => {
      const res = await fetch("/api/agents/list");
      if (!res.ok) return [];
      const json = await res.json();
      return (json.agents ?? []) as Agent[];
    },
    staleTime: 60_000,
  });

  // ── Expanded meeting detail ────────────────────────────────────────────────
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<{
    messages: MeetingMessage[];
    participants: MeetingParticipant[];
  } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadDetail = useCallback(async (meetingId: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/meetings/${meetingId}`);
      if (!res.ok) throw new Error("Failed to load");
      const json = await res.json();
      setDetail({
        messages: json.messages ?? [],
        participants: json.participants ?? [],
      });
    } catch {
      toast.error("Failed to load meeting details");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const handleExpand = useCallback(
    (meetingId: string) => {
      if (expandedId === meetingId) {
        setExpandedId(null);
        setDetail(null);
      } else {
        setExpandedId(meetingId);
        loadDetail(meetingId);
      }
    },
    [expandedId, loadDetail]
  );

  // ── New meeting dialog state ───────────────────────────────────────────────
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newTopic, setNewTopic] = useState("");
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  const toggleAgent = (agentId: string) => {
    setSelectedAgents((prev) =>
      prev.includes(agentId)
        ? prev.filter((id) => id !== agentId)
        : [...prev, agentId]
    );
  };

  const handleCreate = async () => {
    if (!newTitle.trim() || !newTopic.trim() || selectedAgents.length === 0) {
      toast.error("Please fill in all fields and select at least one agent");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/meetings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          topic: newTopic,
          participant_ids: selectedAgents,
          business_id: businessId,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create meeting");
      }
      toast.success("Meeting created");
      setDialogOpen(false);
      setNewTitle("");
      setNewTopic("");
      setSelectedAgents([]);
      refetchMeetings();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create meeting");
    } finally {
      setCreating(false);
    }
  };

  // ── Start meeting ──────────────────────────────────────────────────────────
  const [startingId, setStartingId] = useState<string | null>(null);

  const handleStart = async (meetingId: string) => {
    setStartingId(meetingId);
    try {
      const res = await fetch(`/api/meetings/${meetingId}/start`, {
        method: "POST",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to start meeting");
      }
      toast.success("Meeting completed successfully");
      refetchMeetings();
      if (expandedId === meetingId) {
        loadDetail(meetingId);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to start meeting");
    } finally {
      setStartingId(null);
    }
  };

  // ── Approve / Reject ──────────────────────────────────────────────────────
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleApprove = async (meetingId: string) => {
    setActionLoading(meetingId);
    try {
      const res = await fetch(`/api/meetings/${meetingId}/approve`, {
        method: "POST",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to approve");
      }
      toast.success("Meeting approved");
      refetchMeetings();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to approve");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (meetingId: string) => {
    setActionLoading(meetingId);
    try {
      const res = await fetch(`/api/meetings/${meetingId}/reject`, {
        method: "POST",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to reject");
      }
      toast.success("Meeting rejected");
      refetchMeetings();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to reject");
    } finally {
      setActionLoading(null);
    }
  };

  // ── Build sender lookup from detail participants ───────────────────────────
  const senderMap: Record<string, { name: string; role: string }> = {};
  if (detail?.participants) {
    for (const p of detail.participants) {
      if (p.profiles) {
        senderMap[p.profile_id] = {
          name: p.profiles.full_name || "Agent",
          role: p.profiles.agent_role || "participant",
        };
      }
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (!businessId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-text-secondary">
        <Users className="mb-3 h-10 w-10 opacity-40" />
        <p className="text-sm">Select a workspace to view meetings.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1080px] px-6 py-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MessageSquare className="h-6 w-6 text-text-secondary" />
          <h1 className="text-2xl font-bold text-text-primary font-display">
            Meetings
          </h1>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              New Meeting
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>New Meeting</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-primary">
                  Title
                </label>
                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g., Q2 Strategy Review"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-primary">
                  Topic
                </label>
                <Textarea
                  value={newTopic}
                  onChange={(e) => setNewTopic(e.target.value)}
                  placeholder="What should the agents discuss?"
                  rows={3}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-primary">
                  Agents
                </label>
                {agents.length === 0 ? (
                  <p className="text-sm text-text-tertiary">
                    No agents found. Create agents in Settings first.
                  </p>
                ) : (
                  <div className="mt-1.5 space-y-1.5">
                    {agents.map((agent) => {
                      const selected = selectedAgents.includes(agent.id);
                      return (
                        <button
                          key={agent.id}
                          type="button"
                          onClick={() => toggleAgent(agent.id)}
                          className={`flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                            selected
                              ? "border-primary bg-primary/10 text-text-primary"
                              : "border-border bg-bg-secondary text-text-secondary hover:border-primary/40"
                          }`}
                        >
                          <Bot className="h-4 w-4 shrink-0" />
                          <span className="flex-1 truncate font-medium">
                            {agent.full_name}
                          </span>
                          {agent.agent_role && (
                            <span className="shrink-0 text-xs text-text-tertiary">
                              {agent.agent_role}
                            </span>
                          )}
                          {selected && (
                            <Check className="h-4 w-4 shrink-0 text-primary" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              <Button
                className="w-full"
                onClick={handleCreate}
                disabled={
                  creating ||
                  !newTitle.trim() ||
                  !newTopic.trim() ||
                  selectedAgents.length === 0
                }
              >
                {creating ? "Creating..." : "Create Meeting"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Loading state */}
      {meetingsLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-md border border-border bg-bg-secondary"
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!meetingsLoading && meetings.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-bg-secondary py-16">
          <Users className="mb-3 h-10 w-10 text-text-tertiary opacity-50" />
          <p className="mb-1 text-sm font-medium text-text-primary">
            No meetings yet
          </p>
          <p className="text-xs text-text-secondary">
            Create a meeting and let your AI agents discuss.
          </p>
        </div>
      )}

      {/* Meeting list */}
      <div className="space-y-3">
        {meetings.map((meeting) => {
          const isExpanded = expandedId === meeting.id;
          const isCreator = userId === meeting.created_by;
          const statusConfig = STATUS_CONFIG[meeting.status];

          return (
            <Card
              key={meeting.id}
              className="border-border bg-bg-secondary overflow-hidden"
            >
              {/* Card header — clickable to expand */}
              <button
                type="button"
                onClick={() => handleExpand(meeting.id)}
                className="flex w-full items-start gap-4 p-4 text-left transition-colors hover:bg-surface"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-text-primary truncate">
                      {meeting.title}
                    </h3>
                    <Badge
                      className={`text-[10px] px-1.5 py-0 ${statusConfig.className}`}
                    >
                      {statusConfig.label}
                    </Badge>
                  </div>
                  <p className="text-xs text-text-secondary line-clamp-1">
                    {meeting.topic}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0 text-xs text-text-tertiary">
                  <span className="flex items-center gap-1">
                    <Bot className="h-3.5 w-3.5" />
                    {meeting.participant_count}
                  </span>
                  <span>
                    {new Date(meeting.created_at).toLocaleDateString()}
                  </span>
                </div>
              </button>

              {/* Action buttons row */}
              {isCreator && (
                <div className="flex items-center gap-2 border-t border-border px-4 py-2">
                  {meeting.status === "draft" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStart(meeting.id);
                      }}
                      disabled={startingId === meeting.id}
                    >
                      <Play className="h-3.5 w-3.5" />
                      {startingId === meeting.id
                        ? "Running..."
                        : "Start Meeting"}
                    </Button>
                  )}
                  {meeting.status === "completed" && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-xs text-emerald-400 border-emerald-400/30 hover:bg-emerald-400/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApprove(meeting.id);
                        }}
                        disabled={actionLoading === meeting.id}
                      >
                        <Check className="h-3.5 w-3.5" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-xs text-red-400 border-red-400/30 hover:bg-red-400/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReject(meeting.id);
                        }}
                        disabled={actionLoading === meeting.id}
                      >
                        <X className="h-3.5 w-3.5" />
                        Reject
                      </Button>
                    </>
                  )}
                </div>
              )}

              {/* Expanded detail */}
              {isExpanded && (
                <div className="border-t border-border">
                  {detailLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    </div>
                  ) : detail ? (
                    <div className="divide-y divide-border">
                      {/* Messages */}
                      {detail.messages.length > 0 && (
                        <div className="p-4 space-y-3">
                          <p className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                            Discussion
                          </p>
                          {detail.messages.map((msg) => {
                            const sender = senderMap[msg.sender_id];
                            return (
                              <div
                                key={msg.id}
                                className="flex gap-3"
                              >
                                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface text-xs font-bold text-text-secondary">
                                  <Bot className="h-3.5 w-3.5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-baseline gap-2 mb-0.5">
                                    <span className="text-xs font-semibold text-text-primary">
                                      {sender?.name || "Agent"}
                                    </span>
                                    {sender?.role && (
                                      <span className="text-[10px] text-text-tertiary">
                                        {sender.role}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-sm text-text-secondary leading-relaxed">
                                    {msg.content}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Conclusion */}
                      {meeting.conclusion && (
                        <div className="p-4">
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                            Conclusion
                          </p>
                          <div className="rounded-md border border-border bg-surface p-3">
                            <p className="text-sm text-text-primary whitespace-pre-wrap leading-relaxed">
                              {meeting.conclusion}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* No messages yet */}
                      {detail.messages.length === 0 && !meeting.conclusion && (
                        <div className="flex flex-col items-center py-8 text-text-tertiary">
                          <MessageSquare className="mb-2 h-6 w-6 opacity-40" />
                          <p className="text-xs">
                            No messages yet. Start the meeting to begin the discussion.
                          </p>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
