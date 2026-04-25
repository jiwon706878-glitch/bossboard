"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Avatar } from "@/components/desktop/avatar";
import { Modal } from "@/components/desktop/modal";
import {
  listAgents,
  createAgent,
  type Agent,
  type AgentTemplate,
  type AgentProvider,
} from "@/lib/agents/service";

const TEMPLATES: { value: AgentTemplate; label: string; hint: string }[] = [
  {
    value: "personal-assistant",
    label: "Personal Assistant",
    hint: "Friendly generalist with read access to your whole Library.",
  },
  {
    value: "marketing-lead",
    label: "Marketing Lead",
    hint: "Campaign brainstorming, audience analysis, content strategy.",
  },
  {
    value: "code-reviewer",
    label: "Code Reviewer",
    hint: "Bug, perf, and security review. Runs on Gemini Flash by default.",
  },
  { value: "blank", label: "Blank", hint: "Start from scratch and write your own manual." },
];

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [template, setTemplate] = useState<AgentTemplate>("personal-assistant");
  const [provider, setProvider] = useState<AgentProvider>("google");

  async function refresh() {
    setLoading(true);
    setAgents(await listAgents());
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleCreate() {
    if (!name.trim() || !role.trim()) {
      setError("Name and role are required.");
      return;
    }
    setCreating(true);
    setError(null);
    try {
      await createAgent(name.trim(), role.trim(), template, provider);
      setCreateOpen(false);
      setName("");
      setRole("");
      setTemplate("personal-assistant");
      setProvider("google");
      await refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link
              href="/desktop/dashboard"
              className="text-sm text-gray-400 hover:text-white"
            >
              ← Dashboard
            </Link>
            <h1 className="text-3xl font-bold mt-2">Agents</h1>
            <p className="text-sm text-gray-400 mt-1">
              Each agent lives in <code>/agents/{`{name}`}/</code> with its own manual + workspace.
            </p>
          </div>
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 px-3 py-2 bg-bb-primary hover:bg-bb-primary-hover rounded-md text-sm"
          >
            <Plus className="w-4 h-4" /> New agent
          </button>
        </div>

        {loading ? (
          <div className="text-gray-400">Loading…</div>
        ) : agents.length === 0 ? (
          <div className="p-8 bg-bb-card border border-bb-border rounded-md text-center text-gray-400">
            No agents yet. Click &quot;New agent&quot; to create your first one.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {agents.map((a) => (
              <Link
                key={a.name}
                href={`/desktop/dm/${encodeURIComponent(a.name)}`}
                className="flex items-center gap-3 p-4 bg-bb-card border border-bb-border rounded-md hover:border-bb-primary transition"
              >
                <Avatar displayName={a.name} size="lg" />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{a.name}</div>
                  <div className="text-xs text-gray-400 truncate">{a.role || "Agent"}</div>
                  <div className="text-[10px] text-gray-500 mt-1">
                    {a.ai_provider || "?"} · {a.model || "?"}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Create agent">
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Marketing-Lead"
              className="w-full p-2 bg-bb-bg border border-bb-border rounded-md text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Role</label>
            <input
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="Senior marketing strategist"
              className="w-full p-2 bg-bb-bg border border-bb-border rounded-md text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Template</label>
            <select
              value={template}
              onChange={(e) => setTemplate(e.target.value as AgentTemplate)}
              className="w-full p-2 bg-bb-bg border border-bb-border rounded-md text-sm"
            >
              {TEMPLATES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <div className="text-[11px] text-gray-500 mt-1">
              {TEMPLATES.find((t) => t.value === template)?.hint}
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">AI provider</label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as AgentProvider)}
              className="w-full p-2 bg-bb-bg border border-bb-border rounded-md text-sm"
            >
              <option value="google">Google Gemini Flash (cheapest)</option>
              <option value="anthropic">Anthropic Claude</option>
            </select>
          </div>
          {error && (
            <div className="p-2 bg-red-900/20 border border-red-800 rounded text-red-300 text-sm">
              {error}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setCreateOpen(false)}
              className="px-3 py-1.5 text-sm border border-bb-border hover:bg-bb-bg rounded-md"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={creating}
              className="px-3 py-1.5 text-sm bg-bb-primary hover:bg-bb-primary-hover rounded-md disabled:opacity-50"
            >
              {creating ? "Creating…" : "Create"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
