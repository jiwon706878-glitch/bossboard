"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Avatar } from "@/components/desktop/avatar";
import { listAgents, type Agent } from "@/lib/agents/service";

export default function DMIndexPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listAgents()
      .then(setAgents)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Direct Messages</h1>
        <p className="text-gray-400 mb-8">Chat with your agents. Conversations stay on your machine.</p>

        {loading ? (
          <div className="text-gray-400">Loading…</div>
        ) : agents.length === 0 ? (
          <div className="p-6 bg-bb-card border border-bb-border rounded-md text-sm text-gray-400">
            No agents yet.
            <Link href="/desktop/agents" className="block text-bb-primary hover:underline mt-2">
              Create your first agent →
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {agents.map((a) => (
              <Link
                key={a.name}
                href={`/desktop/dm/${encodeURIComponent(a.name)}`}
                className="flex items-center gap-3 p-3 bg-bb-card border border-bb-border rounded-md hover:border-bb-primary transition"
              >
                <Avatar displayName={a.name} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{a.name}</div>
                  <div className="text-xs text-gray-500 truncate">{a.role || "Agent"}</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
