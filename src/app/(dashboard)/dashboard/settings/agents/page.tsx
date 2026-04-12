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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus,
  Trash2,
  Pencil,
  Copy,
  AlertTriangle,
  Bot,
  ArrowLeft,
  Check,
  IdCard,
  Zap,
  RefreshCw,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

type AgentStatus = "working" | "resting" | "standby" | "offline";

type ProviderId = "anthropic" | "google" | "openai" | "grok";

interface ProviderModel {
  id: string;
  name: string;
  provider: ProviderId;
}

interface AgentRow {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  agent_role: string | null;
  agent_status: AgentStatus;
  current_task: string | null;
  last_heartbeat: string | null;
  preferred_model: string | null;
  agent_manual_page_id: string | null;
  created_at: string;
}

interface LimitsInfo {
  current: number;
  limit: number | null; // null = unlimited
  plan: "free" | "starter" | "pro" | "business";
  canCreate: boolean;
}

interface WikiOption {
  id: string;
  title: string;
}

// Display label for grouped dropdown headers. Kept here so the
// dropdown doesn't accidentally show raw provider IDs ("grok" →
// "Grok (xAI)").
const PROVIDER_LABELS: Record<ProviderId, string> = {
  anthropic: "Anthropic",
  google: "Google Gemini",
  openai: "OpenAI",
  grok: "Grok (xAI)",
};

const OFFLINE_THRESHOLD_MS = 5 * 60 * 1000;

const NEXT_PLAN: Record<LimitsInfo["plan"], string | null> = {
  free: "Starter",
  starter: "Pro",
  pro: "Business",
  business: null,
};

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Heartbeat-aware status display. If the agent hasn't pinged recently,
 * we report it as offline regardless of what its last self-reported
 * status was — the backend keeps `agent_status` as-is until the agent
 * itself calls /heartbeat, so a crashed process would otherwise look
 * "working" forever.
 */
function displayStatus(agent: AgentRow): AgentStatus {
  if (!agent.last_heartbeat) return "offline";
  const last = new Date(agent.last_heartbeat).getTime();
  if (Date.now() - last > OFFLINE_THRESHOLD_MS) return "offline";
  return agent.agent_status;
}

function statusColor(s: AgentStatus) {
  switch (s) {
    case "working":
      return { bg: "rgba(52, 211, 153, 0.15)", fg: "#34D399", dot: "#34D399" };
    case "resting":
      return { bg: "rgba(79, 139, 255, 0.15)", fg: "#4F8BFF", dot: "#4F8BFF" };
    case "standby":
      return { bg: "rgba(251, 191, 36, 0.15)", fg: "#FBBF24", dot: "#FBBF24" };
    default:
      return {
        bg: "var(--muted)",
        fg: "var(--muted-foreground)",
        dot: "#6B7280",
      };
  }
}

function relativeTime(iso: string | null): string {
  if (!iso) return "never";
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function AgentsSettingsPage() {
  const supabase = createClient();
  const currentBusiness = useBusinessStore((s) => s.currentBusiness);
  const businessId = currentBusiness?.id;

  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [limits, setLimits] = useState<LimitsInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [wikiOptions, setWikiOptions] = useState<WikiOption[]>([]);

  // Live model discovery state. Fetched on mount so both Create and
  // Edit modals can receive the same list without duplicate calls.
  // The server-side route caches per user for 24h and now returns a
  // pre-computed `latest` (one model per family) alongside the full
  // `all` catalog — see /api/ai/available-models.
  const [availableModels, setAvailableModels] = useState<ProviderModel[]>([]);
  const [latestModels, setLatestModels] = useState<ProviderModel[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AgentRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AgentRow | null>(null);

  const loadAgents = useCallback(async () => {
    try {
      const res = await fetch("/api/agents/list", { cache: "no-store" });
      if (!res.ok) {
        toast.error("Failed to load agents");
        return;
      }
      const data = await res.json();
      setAgents(data.agents ?? []);
      setLimits(data.limits ?? null);
    } catch {
      toast.error("Failed to load agents");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  const loadModels = useCallback(async (forceRefresh = false) => {
    setLoadingModels(true);
    // Run the cache-bust POST in its own try so a failure there
    // doesn't prevent the follow-up GET from attempting to read
    // whatever cached or fresh data is available. Worst case: the
    // refresh doesn't actually refresh, but the user still sees
    // their current model list.
    if (forceRefresh) {
      try {
        await fetch("/api/ai/available-models", { method: "POST" });
      } catch {
        // Ignore — fall through to the GET.
      }
    }
    try {
      const res = await fetch("/api/ai/available-models", {
        cache: "no-store",
      });
      if (!res.ok) {
        setAvailableModels([]);
        setLatestModels([]);
        return;
      }
      const data = await res.json();
      // Prefer the new `all` shape; fall back to `models` for any
      // pre-Latest cached entry that might still be in flight on
      // a freshly-deployed instance.
      setAvailableModels(
        (data.all ?? data.models ?? []) as ProviderModel[]
      );
      setLatestModels((data.latest ?? []) as ProviderModel[]);
    } catch {
      setAvailableModels([]);
      setLatestModels([]);
    } finally {
      setLoadingModels(false);
    }
  }, []);

  useEffect(() => {
    loadModels();
  }, [loadModels]);

  // Load wiki pages for the "manual" dropdown — filtered to the current
  // business, non-deleted. Uses the Supabase client directly since it's
  // read-only and RLS enforces ownership.
  useEffect(() => {
    if (!businessId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("sops")
        .select("id, title")
        .eq("business_id", businessId)
        .is("deleted_at", null)
        .order("title", { ascending: true })
        .limit(200);
      if (!cancelled) {
        setWikiOptions((data ?? []) as WikiOption[]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [businessId, supabase]);

  const atLimit =
    !!limits && limits.limit !== null && limits.current >= limits.limit;
  const nextPlan = limits ? NEXT_PLAN[limits.plan] : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/settings"
          className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
        >
          <ArrowLeft className="h-4 w-4" />
          Settings
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Bot className="h-7 w-7" /> AI Agents
          </h1>
          <p className="text-muted-foreground mt-1">
            Hire, edit, and monitor the AI agents on your team. Each agent
            gets its own API key and activity log.
          </p>
          {limits && (
            <p className="mt-2 text-sm text-muted-foreground font-mono">
              {limits.current} / {limits.limit === null ? "∞" : limits.limit}{" "}
              agents ·{" "}
              <span className="capitalize">{limits.plan}</span> plan
            </p>
          )}
        </div>
        <Button
          onClick={() => {
            // Force-refresh the model list so a user who just added a
            // provider key in settings sees the new models without
            // waiting for the 24h cache to expire.
            loadModels(true);
            setCreateOpen(true);
          }}
          disabled={atLimit}
          className="gap-2 w-full sm:w-auto"
        >
          <Plus className="h-4 w-4" />
          Create Agent
        </Button>
      </div>

      {atLimit && (
        <div
          className="flex items-start gap-3 rounded-md border p-4"
          style={{
            borderColor: "#FBBF24",
            backgroundColor: "rgba(251, 191, 36, 0.08)",
          }}
        >
          <AlertTriangle
            className="h-5 w-5 shrink-0 mt-0.5"
            style={{ color: "#FBBF24" }}
          />
          <div className="text-sm flex-1">
            <strong>Agent limit reached</strong> ({limits?.limit}).{" "}
            {nextPlan ? (
              <>
                <Link
                  href="/dashboard/billing"
                  className="underline font-medium"
                  style={{ color: "#FBBF24" }}
                >
                  Upgrade to {nextPlan}
                </Link>{" "}
                for more agent slots.
              </>
            ) : (
              <>Your plan is at the maximum tier.</>
            )}
          </div>
        </div>
      )}

      {loading ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Loading agents...
          </CardContent>
        </Card>
      ) : agents.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Bot className="h-10 w-10 mx-auto text-muted-foreground" />
            <h3 className="mt-4 font-semibold">No agents yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Create your first AI agent to get started.
            </p>
            {!atLimit && (
              <Button
                className="mt-4"
                size="sm"
                onClick={() => setCreateOpen(true)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Create Agent
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {agents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              wikiOptions={wikiOptions}
              onEdit={() => setEditTarget(agent)}
              onDelete={() => setDeleteTarget(agent)}
            />
          ))}
        </div>
      )}

      <CreateAgentDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        wikiOptions={wikiOptions}
        availableModels={availableModels}
        latestModels={latestModels}
        loadingModels={loadingModels}
        onCreated={loadAgents}
      />

      {editTarget && (
        <EditAgentDialog
          agent={editTarget}
          wikiOptions={wikiOptions}
          availableModels={availableModels}
          latestModels={latestModels}
          loadingModels={loadingModels}
          onRefreshModels={() => loadModels(true)}
          onClose={() => setEditTarget(null)}
          onUpdated={loadAgents}
        />
      )}

      {deleteTarget && (
        <DeleteAgentDialog
          agent={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={loadAgents}
        />
      )}
    </div>
  );
}

// ─── Agent card ─────────────────────────────────────────────────────────────

function AgentCard({
  agent,
  wikiOptions,
  onEdit,
  onDelete,
}: {
  agent: AgentRow;
  wikiOptions: WikiOption[];
  onEdit: () => void;
  onDelete: () => void;
}) {
  const status = displayStatus(agent);
  const color = statusColor(status);
  const manualTitle =
    wikiOptions.find((w) => w.id === agent.agent_manual_page_id)?.title ?? null;

  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold">
                {agent.full_name || "Unnamed agent"}
              </h3>
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium capitalize"
                style={{ backgroundColor: color.bg, color: color.fg }}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: color.dot }}
                />
                {status}
              </span>
            </div>
            {agent.agent_role && (
              <p className="mt-0.5 text-sm text-muted-foreground">
                {agent.agent_role}
              </p>
            )}
            {agent.current_task && status !== "offline" && (
              <p className="mt-2 text-sm">
                <span className="text-muted-foreground">Current:</span>{" "}
                {agent.current_task}
              </p>
            )}
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>
                Last seen:{" "}
                <span className="font-mono">
                  {relativeTime(agent.last_heartbeat)}
                </span>
              </span>
              {agent.preferred_model ? (
                <span>
                  Model: <span className="font-mono">{agent.preferred_model}</span>
                </span>
              ) : (
                <span>Model: BYOK</span>
              )}
              {manualTitle && <span>Manual: {manualTitle}</span>}
            </div>
          </div>
          <div className="flex gap-1 shrink-0">
            <Button
              size="icon"
              variant="ghost"
              onClick={onEdit}
              title="Edit agent"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={onDelete}
              title="Delete agent"
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Create dialog ──────────────────────────────────────────────────────────

function CreateAgentDialog({
  open,
  onOpenChange,
  wikiOptions,
  availableModels,
  latestModels,
  loadingModels,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wikiOptions: WikiOption[];
  availableModels: ProviderModel[];
  latestModels: ProviderModel[];
  loadingModels: boolean;
  onCreated: () => void;
}) {
  const [step, setStep] = useState<"form" | "show-key">("form");
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [preferredModel, setPreferredModel] = useState("");
  const [manualPageId, setManualPageId] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [createdKey, setCreatedKey] = useState<string>("");
  const [createdAgentName, setCreatedAgentName] = useState<string>("");

  // Group models by provider so the dropdown shows header labels
  // ("Anthropic", "Google Gemini", ...) instead of a flat mix.
  const groupedModels = availableModels.reduce<
    Record<ProviderId, ProviderModel[]>
  >(
    (acc, m) => {
      (acc[m.provider] ??= []).push(m);
      return acc;
    },
    {} as Record<ProviderId, ProviderModel[]>
  );
  const noModels = !loadingModels && availableModels.length === 0;

  function resetForm() {
    setStep("form");
    setName("");
    setRole("");
    setPreferredModel("");
    setManualPageId("");
    setCreatedKey("");
    setCreatedAgentName("");
  }

  function handleClose() {
    onOpenChange(false);
    // Reset after the dialog close animation so the form doesn't
    // flicker back to the first step while sliding away.
    setTimeout(resetForm, 200);
    if (step === "show-key") onCreated();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/agents/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          role,
          preferred_model: preferredModel || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg =
          data.error === "no_business"
            ? "Create a business in Settings before adding agents"
            : data.error === "Agent limit reached"
              ? `Agent limit reached (${data.current}/${data.limit ?? "∞"})`
              : data.error || "Failed to create agent";
        toast.error(msg);
        return;
      }
      if (!data.apiKey?.key) {
        toast.error("Agent created but API key missing — check logs");
        return;
      }

      // If a manual page was picked, patch it on — the create route
      // doesn't accept agent_manual_page_id yet (Day 1 foundation).
      if (manualPageId && data.agent?.id) {
        await fetch(`/api/agents/${data.agent.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agent_manual_page_id: manualPageId }),
        });
      }

      setCreatedKey(data.apiKey.key);
      setCreatedAgentName(data.agent?.full_name ?? name);
      setStep("show-key");
    } catch {
      toast.error("Failed to create agent");
    } finally {
      setSaving(false);
    }
  }

  function copyKey() {
    navigator.clipboard?.writeText(createdKey).then(
      () => toast.success("API key copied"),
      () => toast.error("Clipboard unavailable — select and copy manually")
    );
  }

  // Aspirational CLI command — the `bossboard-agent` npm package isn't
  // published yet. Shown as "coming soon" so users see what the
  // workflow will look like once the CLI ships.
  const cliPreview = `npx bossboard-agent start --name "${createdAgentName}" --key ${createdKey}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {step === "form" ? (
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Hire a new AI agent</DialogTitle>
              <DialogDescription>
                Give your agent a name, a role, and optionally a manual page
                it should read on every loop.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label htmlFor="agent-name">Name</Label>
                <Input
                  id="agent-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  maxLength={100}
                  placeholder="Nova"
                  autoFocus
                />
              </div>
              <div>
                <Label htmlFor="agent-role">Role</Label>
                <Input
                  id="agent-role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  required
                  maxLength={100}
                  placeholder="Marketing Lead, Code Reviewer, Research Analyst..."
                />
              </div>
              <div>
                <Label htmlFor="agent-model">AI model</Label>
                {loadingModels ? (
                  <div className="mt-1 rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground">
                    Loading available models...
                  </div>
                ) : noModels ? (
                  <div
                    className="mt-1 rounded-md border p-3 text-sm"
                    style={{
                      borderColor: "#FBBF24",
                      backgroundColor: "rgba(251, 191, 36, 0.08)",
                    }}
                  >
                    <div className="flex items-start gap-2">
                      <AlertTriangle
                        className="h-4 w-4 shrink-0 mt-0.5"
                        style={{ color: "#FBBF24" }}
                      />
                      <div className="flex-1">
                        <p className="font-semibold">
                          No AI providers connected
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Agents need an AI model to function. Connect at
                          least one provider (Anthropic, Google, OpenAI, or
                          Grok) in Settings.
                        </p>
                        <Link
                          href="/dashboard/settings#external-api-keys"
                          className="mt-2 inline-block text-xs font-medium underline"
                          style={{ color: "#FBBF24" }}
                        >
                          Connect a provider →
                        </Link>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <select
                      id="agent-model"
                      value={preferredModel}
                      onChange={(e) => setPreferredModel(e.target.value)}
                      required
                      className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="">Select a model...</option>

                      {/* ⭐ Latest section: one model per family.
                          React keys are prefixed with "latest-" to
                          stay unique against the All section below
                          (same model id may appear in both). The
                          option `value` is still the raw model id
                          so the server contract is unchanged. */}
                      {latestModels.length > 0 && (
                        <optgroup label="⭐ Latest (recommended)">
                          {latestModels.map((m) => (
                            <option key={`latest-${m.id}`} value={m.id}>
                              {m.name} ({PROVIDER_LABELS[m.provider]})
                            </option>
                          ))}
                        </optgroup>
                      )}

                      {/* 📦 All Models — full catalog grouped by provider */}
                      {(Object.keys(groupedModels) as ProviderId[]).map(
                        (provider) => (
                          <optgroup
                            key={provider}
                            label={`📦 All ${PROVIDER_LABELS[provider]}`}
                          >
                            {groupedModels[provider].map((m) => (
                              <option key={`all-${m.id}`} value={m.id}>
                                {m.name}
                              </option>
                            ))}
                          </optgroup>
                        )
                      )}
                    </select>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Powered by your BYOK. This agent uses your API key and
                      your billing whenever it thinks.
                    </p>
                  </>
                )}
              </div>
              <div>
                <Label htmlFor="agent-manual">Manual wiki page (optional)</Label>
                <select
                  id="agent-manual"
                  value={manualPageId}
                  onChange={(e) => setManualPageId(e.target.value)}
                  className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">— none —</option>
                  {wikiOptions.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.title}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-muted-foreground">
                  The agent reads this page as its job description on every
                  loop. You can write it in the wiki — no code needed.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  saving ||
                  loadingModels ||
                  noModels ||
                  !name.trim() ||
                  !role.trim() ||
                  !preferredModel
                }
              >
                {saving ? "Creating..." : "Create agent"}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <IdCard className="h-5 w-5 text-primary" />
                Agent ID key created
              </DialogTitle>
              <DialogDescription>
                This key is like an ID card for{" "}
                <strong>{createdAgentName}</strong> — it identifies the
                agent to BossBoard&apos;s servers. It is <em>not</em> the
                key that powers the agent&apos;s thinking.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Two-key explainer */}
              <div
                className="rounded-md border p-3 text-sm"
                style={{
                  borderColor: "var(--border)",
                  backgroundColor: "var(--muted)",
                }}
              >
                <p className="font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Two different keys, two different jobs
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-md border bg-background p-3">
                    <div className="flex items-center gap-1.5 text-xs font-semibold">
                      <IdCard className="h-3.5 w-3.5 text-primary" />
                      This key (<code className="font-mono">bb_…</code>)
                    </div>
                    <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                      Proves who the agent is when talking to BossBoard.
                      Like an ID card. Zero AI cost.
                    </p>
                  </div>
                  <div className="rounded-md border bg-background p-3">
                    <div className="flex items-center gap-1.5 text-xs font-semibold">
                      <Zap className="h-3.5 w-3.5 text-amber-500" />
                      Your AI provider key
                    </div>
                    <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                      <code className="font-mono">sk-ant-…</code>,{" "}
                      <code className="font-mono">AIza…</code>, etc. Powers
                      the agent&apos;s thinking. Your billing, your quota.
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  Your agent uses <strong>both</strong> when running.
                </p>
              </div>

              {/* The key */}
              <div>
                <Label>Agent key</Label>
                <div className="mt-1 flex gap-2">
                  <Input
                    value={createdKey}
                    readOnly
                    className="font-mono text-xs"
                    onFocus={(e) => e.currentTarget.select()}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={copyKey}
                    className="shrink-0"
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    Copy
                  </Button>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Shown once. BossBoard stores a hash, not the key. If
                  lost, delete the agent and create a new one.
                </p>
              </div>

              {/* Aspirational CLI quick start */}
              <div>
                <Label>Quick start (CLI launching soon)</Label>
                <div
                  className="mt-1 rounded-md border p-3 font-mono text-xs overflow-x-auto"
                  style={{
                    backgroundColor: "#0C0F17",
                    borderColor: "var(--border)",
                    color: "#DCDCDC",
                  }}
                >
                  {cliPreview}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  The dedicated CLI is launching soon. In the meantime,
                  use the agent key with any MCP client or REST API call.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleClose}>I&apos;ve saved the key</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit dialog ────────────────────────────────────────────────────────────

function EditAgentDialog({
  agent,
  wikiOptions,
  availableModels,
  latestModels,
  loadingModels,
  onRefreshModels,
  onClose,
  onUpdated,
}: {
  agent: AgentRow;
  wikiOptions: WikiOption[];
  availableModels: ProviderModel[];
  latestModels: ProviderModel[];
  loadingModels: boolean;
  onRefreshModels: () => void;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [name, setName] = useState(agent.full_name ?? "");
  const [role, setRole] = useState(agent.agent_role ?? "");
  const [preferredModel, setPreferredModel] = useState(
    agent.preferred_model ?? ""
  );
  const [manualPageId, setManualPageId] = useState(
    agent.agent_manual_page_id ?? ""
  );
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/agents/${agent.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          role,
          preferred_model: preferredModel || null,
          agent_manual_page_id: manualPageId || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Failed to update agent");
        return;
      }
      toast.success("Agent updated");
      onUpdated();
      onClose();
    } catch {
      toast.error("Failed to update agent");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit agent</DialogTitle>
            <DialogDescription>
              Update your agent&apos;s name, role, model, or manual page.
              API key rotation is launching soon.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={100}
              />
            </div>
            <div>
              <Label htmlFor="edit-role">Role</Label>
              <Input
                id="edit-role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                required
                maxLength={100}
              />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="edit-model">AI model</Label>
                <button
                  type="button"
                  onClick={onRefreshModels}
                  disabled={loadingModels}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
                  title="Refresh available models from your providers"
                >
                  <RefreshCw
                    className={`h-3 w-3 ${loadingModels ? "animate-spin" : ""}`}
                  />
                  Refresh
                </button>
              </div>
              <select
                id="edit-model"
                value={preferredModel}
                onChange={(e) => setPreferredModel(e.target.value)}
                className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                disabled={loadingModels}
              >
                {/*
                 * If the agent's current model isn't in the fetched
                 * list (provider removed it, or the user rotated
                 * keys), preserve it as a first option so the user
                 * can see what's set and choose a replacement.
                 */}
                {preferredModel &&
                  !availableModels.some((m) => m.id === preferredModel) && (
                    <option value={preferredModel}>
                      {preferredModel} (current)
                    </option>
                  )}
                <option value="">Select a model...</option>

                {/* ⭐ Latest section — same as Create dialog */}
                {latestModels.length > 0 && (
                  <optgroup label="⭐ Latest (recommended)">
                    {latestModels.map((m) => (
                      <option key={`latest-${m.id}`} value={m.id}>
                        {m.name} ({PROVIDER_LABELS[m.provider]})
                      </option>
                    ))}
                  </optgroup>
                )}

                {/* 📦 All Models — full catalog grouped by provider */}
                {(Object.keys(
                  availableModels.reduce<Record<ProviderId, ProviderModel[]>>(
                    (acc, m) => {
                      (acc[m.provider] ??= []).push(m);
                      return acc;
                    },
                    {} as Record<ProviderId, ProviderModel[]>
                  )
                ) as ProviderId[]).map((provider) => {
                  const models = availableModels.filter(
                    (m) => m.provider === provider
                  );
                  return (
                    <optgroup
                      key={provider}
                      label={`📦 All ${PROVIDER_LABELS[provider]}`}
                    >
                      {models.map((m) => (
                        <option key={`all-${m.id}`} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </optgroup>
                  );
                })}
              </select>
              {availableModels.length === 0 && !loadingModels && (
                <p className="mt-1 text-xs text-muted-foreground">
                  No AI providers connected.{" "}
                  <Link
                    href="/dashboard/settings#external-api-keys"
                    className="underline"
                  >
                    Connect one in Settings
                  </Link>{" "}
                  to see models here.
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="edit-manual">Manual wiki page</Label>
              <select
                id="edit-manual"
                value={manualPageId}
                onChange={(e) => setManualPageId(e.target.value)}
                className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">— none —</option>
                {wikiOptions.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.title}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !name.trim() || !role.trim()}>
              {saving ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Delete dialog ──────────────────────────────────────────────────────────

function DeleteAgentDialog({
  agent,
  onClose,
  onDeleted,
}: {
  agent: AgentRow;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/agents/${agent.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Failed to delete agent");
        return;
      }
      toast.success(`${agent.full_name ?? "Agent"} deleted`);
      onDeleted();
      onClose();
    } catch {
      toast.error("Failed to delete agent");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete {agent.full_name ?? "this agent"}?
          </DialogTitle>
          <DialogDescription>
            This cannot be undone. The agent&apos;s API key will be
            invalidated immediately and all of its activity history will
            be removed. Any running processes using this key will stop
            working.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={deleting}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? "Deleting..." : "Delete agent"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
