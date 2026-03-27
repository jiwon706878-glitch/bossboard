"use client";

import { useEffect, useState, useCallback } from "react";
import { format, startOfDay, startOfWeek, startOfMonth, isToday, isYesterday } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Activity, Zap } from "lucide-react";

interface LogEntry {
  id: string;
  endpoint: string;
  method: string;
  status_code: number | null;
  created_at: string;
  key_name?: string;
}

interface ApiKeyMap {
  [id: string]: string;
}

export default function AgentActivityPage() {
  const supabase = createClient();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [todayCount, setTodayCount] = useState(0);
  const [weekCount, setWeekCount] = useState(0);
  const [monthCount, setMonthCount] = useState(0);

  const loadData = useCallback(async () => {
    const { data: logData } = await supabase
      .from("agent_activity_log")
      .select("id, api_key_id, endpoint, method, status_code, created_at")
      .order("created_at", { ascending: false })
      .limit(200);

    if (!logData || logData.length === 0) {
      setLogs([]);
      setLoading(false);
      return;
    }

    // Resolve API key names
    const keyIds = [...new Set(logData.map((l) => l.api_key_id).filter(Boolean))];
    const keyMap: ApiKeyMap = {};
    if (keyIds.length > 0) {
      const { data: keys } = await supabase
        .from("api_keys")
        .select("id, name")
        .in("id", keyIds);
      for (const k of keys ?? []) {
        keyMap[k.id] = k.name;
      }
    }

    const enriched: LogEntry[] = logData.map((l) => ({
      ...l,
      key_name: l.api_key_id ? keyMap[l.api_key_id] || "Unknown key" : "—",
    }));

    setLogs(enriched);

    // Stats
    const now = new Date();
    const dayStart = startOfDay(now).toISOString();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 }).toISOString();
    const monthStart = startOfMonth(now).toISOString();

    setTodayCount(enriched.filter((l) => l.created_at >= dayStart).length);
    setWeekCount(enriched.filter((l) => l.created_at >= weekStart).length);
    setMonthCount(enriched.filter((l) => l.created_at >= monthStart).length);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { loadData(); }, [loadData]);

  // Group logs by date
  const grouped = new Map<string, LogEntry[]>();
  for (const log of logs) {
    const dateKey = format(new Date(log.created_at), "yyyy-MM-dd");
    if (!grouped.has(dateKey)) grouped.set(dateKey, []);
    grouped.get(dateKey)!.push(log);
  }

  function formatDateLabel(dateStr: string): string {
    const d = new Date(dateStr + "T00:00:00");
    if (isToday(d)) return "Today";
    if (isYesterday(d)) return "Yesterday";
    return format(d, "EEE, MMM d, yyyy");
  }

  const methodColor: Record<string, string> = {
    GET: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    POST: "bg-primary/10 text-primary",
    PUT: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    DELETE: "bg-destructive/15 text-destructive",
  };

  function statusColor(code: number | null): string {
    if (!code) return "text-muted-foreground";
    if (code < 300) return "text-emerald-600 dark:text-emerald-400";
    if (code < 400) return "text-amber-600 dark:text-amber-400";
    return "text-destructive";
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Agent Activity</h1>
        <p className="text-muted-foreground">API usage from external agents and integrations</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Today", value: todayCount },
          { label: "This week", value: weekCount },
          { label: "This month", value: monthCount },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="py-4 text-center">
              <p className="text-2xl font-bold font-mono">{loading ? "—" : s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Log list */}
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
        <div className="space-y-4">
          {[...grouped.entries()].map(([dateStr, entries]) => (
            <div key={dateStr}>
              <p className="text-xs font-medium text-muted-foreground mb-2">{formatDateLabel(dateStr)}</p>
              <Card>
                <CardContent className="py-2 divide-y">
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
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
