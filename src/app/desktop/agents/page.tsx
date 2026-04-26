"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Avatar } from "@/components/desktop/avatar";
import { listAgents, type Agent } from "@/lib/agents/service";

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    setAgents(await listAgents());
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

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
          <Link
            href="/desktop/agents/new"
            className="flex items-center gap-2 px-3 py-2 bg-bb-primary hover:bg-bb-primary-hover rounded-md text-sm"
          >
            <Plus className="w-4 h-4" /> New agent
          </Link>
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

    </div>
  );
}
