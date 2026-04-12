"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Bot, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type AgentStatus = "working" | "resting" | "standby" | "offline";

interface AgentRow {
  id: string;
  full_name: string | null;
  agent_role: string | null;
  agent_status: AgentStatus;
  current_task: string | null;
  last_heartbeat: string | null;
}

const OFFLINE_THRESHOLD_MS = 5 * 60 * 1000;

function displayStatus(a: AgentRow): AgentStatus {
  if (!a.last_heartbeat) return "offline";
  if (Date.now() - new Date(a.last_heartbeat).getTime() > OFFLINE_THRESHOLD_MS)
    return "offline";
  return a.agent_status;
}

const DOT_COLORS: Record<AgentStatus, string> = {
  working: "#34D399",
  resting: "#4F8BFF",
  standby: "#FBBF24",
  offline: "#6B7280",
};

/**
 * Dashboard widget — compact agent status list with 30s auto-refresh.
 * Shows each agent's name + role + heartbeat-aware status + current
 * task (if working). Links to the agents settings page for management.
 */
export function AgentActivityWidget() {
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/agents/list", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setAgents(data.agents ?? []);
    } catch {
      // Fail silently on dashboard — this is a non-critical widget.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [load]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Bot className="h-4 w-4" />
            My Agents
          </CardTitle>
          <Link href="/dashboard/settings/agents">
            <Button size="sm" variant="ghost" className="h-7 text-xs px-2">
              <Plus className="h-3 w-3 mr-1" />
              Manage
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-10 animate-pulse rounded bg-muted" />
            ))}
          </div>
        ) : agents.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No agents yet.{" "}
            <Link
              href="/dashboard/settings/agents"
              className="underline text-primary"
            >
              Hire one
            </Link>
          </p>
        ) : (
          <div className="space-y-2">
            {agents.slice(0, 5).map((a) => {
              const status = displayStatus(a);
              return (
                <div
                  key={a.id}
                  className="flex items-center gap-3 rounded-md border px-3 py-2"
                >
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: DOT_COLORS[status] }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {a.full_name || "Unnamed"}
                    </p>
                    {status === "working" && a.current_task ? (
                      <p className="text-xs text-muted-foreground truncate">
                        {a.current_task}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground capitalize">
                        {status}
                        {a.agent_role ? ` · ${a.agent_role}` : ""}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
            {agents.length > 5 && (
              <p className="text-xs text-muted-foreground text-center pt-1">
                +{agents.length - 5} more
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
