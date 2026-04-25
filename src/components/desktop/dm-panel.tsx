"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { Avatar } from "@/components/desktop/avatar";
import { listAgents, type Agent } from "@/lib/agents/service";

export function DMPanel({
  isOpen,
  onClose,
  onFeedback,
}: {
  isOpen: boolean;
  onClose: () => void;
  onFeedback?: () => void;
}) {
  const [agents, setAgents] = useState<Agent[]>([]);

  useEffect(() => {
    if (isOpen) {
      listAgents()
        .then(setAgents)
        .catch(() => setAgents([]));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-96 bg-bb-card border-l border-bb-border z-50 flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-bb-border">
          <h2 className="font-semibold">Direct Messages</h2>
          <button onClick={onClose} className="p-1 hover:bg-bb-bg rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-2">
          {agents.length === 0 ? (
            <div className="text-center text-sm text-gray-500 mt-8">
              No agents yet.
              <Link
                href="/desktop/agents"
                onClick={onClose}
                className="block text-bb-primary hover:underline mt-2"
              >
                Create your first agent →
              </Link>
            </div>
          ) : (
            <div className="space-y-1">
              {agents.map((agent) => (
                <Link
                  key={agent.name}
                  href={`/desktop/dm/${encodeURIComponent(agent.name)}`}
                  onClick={onClose}
                  className="flex items-center gap-3 p-2 hover:bg-bb-bg rounded cursor-pointer"
                >
                  <Avatar displayName={agent.name} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{agent.name}</div>
                    <div className="text-xs text-gray-500 truncate">{agent.role || "Agent"}</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="p-3 border-t border-bb-border">
          <button
            onClick={() => onFeedback?.()}
            className="w-full text-xs text-gray-500 hover:text-gray-300 py-1"
          >
            Send Feedback to BossBoard
          </button>
        </div>
      </div>
    </>
  );
}
