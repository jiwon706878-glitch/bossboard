"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { format, startOfDay, startOfWeek, startOfMonth, subDays, isToday, isYesterday, formatDistanceToNow } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Activity, Key, AlertTriangle, TrendingUp } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

interface LogEntry {
  id: string;
  endpoint: string;
  method: string;
  status_code: number | null;
  created_at: string;
  api_key_id: string | null;
  key_name?: string;
}

interface ApiKeyStat {
  id: string;
  name: string;
  totalCalls: number;
  todayCalls: number;
  errorCount: number;
  errorRate: number;
  lastUsedAt: string | null;
  topAction: string;
}

const methodColor: Record<string, string> = {
  GET: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  POST: "bg-primary/10 text-primary",
  PUT: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  PATCH: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  DELETE: "bg-destructive/15 text-destructive",
};

function statusColor(code: number | null): string {
  if (!code) return "text-muted-foreground";
  if (code < 300) return "text-emerald-600 dark:text-emerald-400";
  if (code < 400) return "text-amber-600 dark:text-amber-400";
  return "text-destructive";
}

export default function AgentActivityPage() {
  const supabase = createClient();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    // Fetch last 30 days of logs
    const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
    const { data: logData } = await supabase
      .from("agent_activity_log")
      .select("id, api_key_id, endpoint, method, status_code, created_at, key_name")
      .gte("created_at", thirtyDaysAgo)
      .order("created_at", { ascending: false })
      .limit(1000);

    if (!logData) {
      setLogs([]);
      setLoading(false);
      return;
    }

    // Resolve API key names from api_keys table for any missing ones
    const keyIds = [...new Set(logData.map((l: LogEntry) => l.api_key_id).filter(Boolean))] as string[];
    const keyMap: Record<string, string> = {};
    if (keyIds.length > 0) {
      const { data: keys } = await supabase
        .from("api_keys")
        .select("id, name")
        .in("id", keyIds);
      for (const k of keys ?? []) {
        keyMap[k.id] = k.name;
      }
    }

    const enriched: LogEntry[] = logData.map((l: LogEntry) => ({
      ...l,
      key_name: l.key_name || (l.api_key_id ? keyMap[l.api_key_id] || "Unknown key" : "—"),
    }));

    setLogs(enriched);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { loadData(); }, [loadData]);

  // Stats
  const stats = useMemo(() => {
    const now = new Date();
    const dayStart = startOfDay(now).toISOString();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 }).toISOString();
    const monthStart = startOfMonth(now).toISOString();
    const errorLogs = logs.filter((l) => l.status_code && l.status_code >= 400);

    return {
      today: logs.filter((l) => l.created_at >= dayStart).length,
      week: logs.filter((l) => l.created_at >= weekStart).length,
      month: logs.filter((l) => l.created_at >= monthStart).length,
      errors: errorLogs.length,
    };
  }, [logs]);

  // Per-agent aggregation
  const agentStats: ApiKeyStat[] = useMemo(() => {
    const byKey = new Map<string, LogEntry[]>();
    for (const log of logs) {
      if (!log.api_key_id) continue;
      if (!byKey.has(log.api_key_id)) byKey.set(log.api_key_id, []);
      byKey.get(log.api_key_id)!.push(log);
    }

    const dayStart = startOfDay(new Date()).toISOString();
    const result: ApiKeyStat[] = [];
    for (const [keyId, entries] of byKey.entries()) {
      const errors = entries.filter((e) => e.status_code && e.status_code >= 400).length;
      const todayCalls = entries.filter((e) => e.created_at >= dayStart).length;

      // Find top action (most common endpoint + method combo)
      const actionCounts = new Map<string, number>();
      for (const e of entries) {
        const key = `${e.method} ${e.endpoint}`;
        actionCounts.set(key, (actionCounts.get(key) ?? 0) + 1);
      }
      let topAction = "—";
      let topCount = 0;
      for (const [action, count] of actionCounts.entries()) {
        if (count > topCount) { topAction = action; topCount = count; }
      }

      result.push({
        id: keyId,
        name: entries[0]?.key_name ?? "Unknown",
        totalCalls: entries.length,
        todayCalls,
        errorCount: errors,
        errorRate: errors / entries.length,
        lastUsedAt: entries[0]?.created_at ?? null,
        topAction,
      });
    }

    return result.sort((a, b) => b.totalCalls - a.totalCalls);
  }, [logs]);

  // Daily call chart data (last 14 days)
  const dailyChart = useMemo(() => {
    const days: { date: string; label: string; calls: number; errors: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const day = subDays(new Date(), i);
      const dayStart = startOfDay(day);
      const dayEnd = startOfDay(subDays(day, -1));
      const dayLogs = logs.filter(
        (l) => new Date(l.created_at) >= dayStart && new Date(l.created_at) < dayEnd,
      );
      days.push({
        date: format(day, "yyyy-MM-dd"),
        label: format(day, "MMM d"),
        calls: dayLogs.length,
        errors: dayLogs.filter((l) => l.status_code && l.status_code >= 400).length,
      });
    }
    return days;
  }, [logs]);

  // Abnormal usage detection: any agent > 5x their avg is flagged
  const alerts = useMemo(() => {
    const flagged: string[] = [];
    for (const stat of agentStats) {
      const avgDaily = stat.totalCalls / 30;
      if (stat.todayCalls > avgDaily * 5 && stat.todayCalls > 20) {
        flagged.push(`${stat.name}: ${stat.todayCalls} calls today (5x normal)`);
      }
      if (stat.errorRate > 0.2 && stat.totalCalls > 10) {
        flagged.push(`${stat.name}: ${Math.round(stat.errorRate * 100)}% error rate`);
      }
    }
    return flagged;
  }, [agentStats]);

  // Group logs by date for the activity feed
  const grouped = useMemo(() => {
    const map = new Map<string, LogEntry[]>();
    for (const log of logs.slice(0, 100)) {
      const dateKey = format(new Date(log.created_at), "yyyy-MM-dd");
      if (!map.has(dateKey)) map.set(dateKey, []);
      map.get(dateKey)!.push(log);
    }
    return map;
  }, [logs]);

  function formatDateLabel(dateStr: string): string {
    const d = new Date(dateStr + "T00:00:00");
    if (isToday(d)) return "Today";
    if (isYesterday(d)) return "Yesterday";
    return format(d, "EEE, MMM d");
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Agent Activity</h1>
        <p className="text-muted-foreground">Monitor API calls from your agents and integrations</p>
      </div>

      {/* ── 4 stat cards ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Today", value: stats.today, icon: TrendingUp },
          { label: "This week", value: stats.week, icon: Activity },
          { label: "This month", value: stats.month, icon: Activity },
          { label: "Errors (30d)", value: stats.errors, icon: AlertTriangle, error: stats.errors > 0 },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              className="rounded-lg border border-border bg-card p-5"
            >
              <div className="flex items-start justify-between">
                <span className="text-sm text-muted-foreground">{s.label}</span>
                <Icon className={cn("h-4 w-4", s.error ? "text-destructive" : "text-muted-foreground")} />
              </div>
              <div className={cn("mt-3 text-3xl font-bold font-mono tracking-tight", s.error && s.value > 0 && "text-destructive")}>
                {loading ? "—" : s.value}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Alerts ── */}
      {alerts.length > 0 && (
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="py-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-warning">
              <AlertTriangle className="h-4 w-4" />
              Unusual activity detected
            </div>
            {alerts.map((alert) => (
              <div key={alert} className="text-xs text-foreground/80 pl-6">{alert}</div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ── Daily calls chart ── */}
      {!loading && logs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Daily API calls (last 14 days)</CardTitle>
          </CardHeader>
          <CardContent className="pb-6">
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                  <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12 }}
                  />
                  <Bar dataKey="calls" fill="#4A6CF7" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="errors" fill="#F87171" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Per-agent table ── */}
      {!loading && agentStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Key className="h-4 w-4" />
              Agents ({agentStats.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="space-y-2">
              {agentStats.map((agent) => {
                const maxCalls = agentStats[0].totalCalls || 1;
                const barWidth = Math.max(4, (agent.totalCalls / maxCalls) * 100);
                const hasError = agent.errorRate > 0.1;
                return (
                  <div key={agent.id} className="rounded-md border border-border p-3 hover:bg-surface transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{agent.name}</p>
                        <p className="text-xs text-muted-foreground font-mono truncate mt-0.5">
                          {agent.topAction}
                        </p>
                        {agent.lastUsedAt && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            Last used {formatDistanceToNow(new Date(agent.lastUsedAt), { addSuffix: true })}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end shrink-0">
                        <div className="flex items-baseline gap-1.5">
                          <span className="font-mono font-semibold text-sm">{agent.totalCalls}</span>
                          <span className="text-[10px] text-muted-foreground">calls</span>
                        </div>
                        {agent.todayCalls > 0 && (
                          <span className="text-[10px] text-muted-foreground">
                            {agent.todayCalls} today
                          </span>
                        )}
                        {hasError && (
                          <span className="text-[10px] text-destructive mt-0.5">
                            {Math.round(agent.errorRate * 100)}% errors
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Log list ── */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-md border bg-muted/40" />)}
        </div>
      ) : logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-md border bg-card py-12 text-center">
          <Activity className="mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No agent activity yet.</p>
          <p className="text-xs text-muted-foreground mt-1">Create an API key in Settings to get started.</p>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 stagger-children">
            {[...grouped.entries()].map(([dateStr, entries]) => (
              <div key={dateStr}>
                <p className="text-xs font-medium text-muted-foreground mb-2">{formatDateLabel(dateStr)}</p>
                <div className="divide-y divide-border">
                  {entries.map((log) => (
                    <div key={log.id} className="flex items-center gap-3 py-2 text-sm">
                      <span className="text-xs text-muted-foreground font-mono w-14 shrink-0">
                        {format(new Date(log.created_at), "HH:mm")}
                      </span>
                      <Badge variant="secondary" className={cn("shrink-0 text-[10px] px-1.5 py-0 font-mono", methodColor[log.method] || "")}>
                        {log.method}
                      </Badge>
                      <span className="min-w-0 truncate font-mono text-xs">{log.endpoint}</span>
                      <span className="flex-1" />
                      <span className={cn("text-xs font-mono shrink-0", statusColor(log.status_code))}>
                        {log.status_code || "—"}
                      </span>
                      <span className="text-[10px] text-muted-foreground shrink-0 max-w-20 truncate" title={log.key_name}>
                        {log.key_name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
