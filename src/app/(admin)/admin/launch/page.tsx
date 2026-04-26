"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  Activity,
  AlertCircle,
  Globe,
  Cpu,
  RefreshCw,
  Send,
  TrendingUp,
  MessageSquare,
  Download,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isAdmin } from "@/lib/auth/admin-check";

interface AdminStats {
  total_users: number;
  active_today: number;
  active_this_week: number;
  by_os: Record<string, number>;
  active_by_os: Record<string, number>;
  by_plan: Record<string, number>;
  by_locale: Record<string, number>;
  mac_waitlist_count: number;
  first_hundred_count: number;
  feedback_pending: number;
  feedback_critical: number;
  errors_24h: number;
  panics_24h: number;
}

const BETA_PRICE: Record<string, number> = {
  starter: 13.86,
  pro: 34.65,
  business: 90.93,
};

export default function LaunchAdminPage() {
  const router = useRouter();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [sendingTelegram, setSendingTelegram] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!user || !isAdmin(user.email)) {
        router.replace("/desktop");
        return;
      }
      setAuthChecked(true);
      loadStats();
    })();
    const interval = setInterval(loadStats, 60_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadStats() {
    setRefreshing(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data, error: rpcError } = await supabase.rpc("admin_get_stats");
      if (rpcError) {
        if (rpcError.code === "42883") {
          setError("admin_get_stats RPC isn't deployed yet. Run supabase migration 20260427400000_v4_admin_stats.sql.");
          return;
        }
        setError(rpcError.message);
        return;
      }
      if (data?.error === "forbidden") {
        setError("Forbidden — your email isn't on the admin allow-list.");
        return;
      }
      setStats(data as AdminStats);
    } finally {
      setRefreshing(false);
    }
  }

  async function sendTelegram() {
    setSendingTelegram(true);
    try {
      const res = await fetch("/api/admin/telegram-summary", { method: "POST" });
      if (res.ok) {
        alert("Telegram summary sent.");
      } else {
        const body = await res.json().catch(() => ({}));
        alert(`Failed: ${body.error ?? res.status}`);
      }
    } finally {
      setSendingTelegram(false);
    }
  }

  if (!authChecked) {
    return (
      <div className="p-6 text-sm text-muted-foreground">Checking admin access…</div>
    );
  }
  if (error) {
    return (
      <div className="p-6 max-w-2xl">
        <div className="rounded-md border border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/30 p-4 text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      </div>
    );
  }
  if (!stats) {
    return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  }

  const mrr =
    (stats.by_plan.starter ?? 0) * BETA_PRICE.starter +
    (stats.by_plan.pro ?? 0) * BETA_PRICE.pro +
    (stats.by_plan.business ?? 0) * BETA_PRICE.business;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">BB Launch Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time stats from Supabase admin_get_stats RPC. Auto-refreshes every 60s.
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href="/api/admin/export-feedback"
            download
            className="px-3 py-2 rounded-lg border hover:bg-muted text-sm inline-flex items-center gap-2"
          >
            <Download className="size-4" />
            Export feedback CSV
          </a>
          <button
            onClick={sendTelegram}
            disabled={sendingTelegram}
            className="px-3 py-2 rounded-lg border hover:bg-muted text-sm inline-flex items-center gap-2 disabled:opacity-50"
          >
            <Send className="size-4" />
            {sendingTelegram ? "Sending…" : "Send to Telegram"}
          </button>
          <button
            onClick={loadStats}
            className="p-2 hover:bg-muted rounded-lg"
            aria-label="Refresh"
          >
            <RefreshCw className={`size-5 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPI label="Total users" value={stats.total_users} icon={Users} />
        <KPI label="Active today" value={stats.active_today} icon={Activity} />
        <KPI
          label="First-100 used"
          value={`${stats.first_hundred_count}/100`}
          icon={TrendingUp}
        />
        <KPI
          label="Critical issues"
          value={stats.feedback_critical}
          icon={AlertCircle}
          alert={stats.feedback_critical > 0}
        />
      </div>

      <Card title="Users by OS" icon={Cpu}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {(["windows", "mac", "linux", "unknown"] as const).map((os) => (
            <OSCard
              key={os}
              os={os}
              total={stats.by_os[os] ?? 0}
              active={stats.active_by_os[os] ?? 0}
              note={
                os === "mac" && (stats.by_os.mac ?? 0) === 0
                  ? `${stats.mac_waitlist_count} on waitlist`
                  : undefined
              }
            />
          ))}
        </div>

        <div className="mt-4 space-y-2 text-sm">
          {(stats.by_os.mac ?? 0) === 0 && stats.mac_waitlist_count > 5 && (
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <AlertCircle className="size-4" />
              {stats.mac_waitlist_count} Mac waitlist signups — prioritize Mac
              build after revenue covers Apple Developer.
            </div>
          )}
          {(stats.by_os.linux ?? 0) > 5 && (
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
              <AlertCircle className="size-4" />
              {stats.by_os.linux} Linux users — consider AppImage build.
            </div>
          )}
        </div>
      </Card>

      <Card title="Users by plan" icon={TrendingUp}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {(["free", "starter", "pro", "business"] as const).map((p) => (
            <div key={p} className="rounded-lg border p-4">
              <div className="text-sm text-muted-foreground capitalize">{p}</div>
              <div className="text-2xl font-bold mt-1">{stats.by_plan[p] ?? 0}</div>
              {p !== "free" && BETA_PRICE[p] && (
                <div className="text-xs text-amber-600 mt-1">
                  ~${((stats.by_plan[p] ?? 0) * BETA_PRICE[p]).toFixed(0)}/mo
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t flex justify-between text-sm">
          <span>Estimated MRR (with beta discount):</span>
          <span className="font-bold">${mrr.toFixed(0)}/mo</span>
        </div>
      </Card>

      <Card title="Users by locale" icon={Globe}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(stats.by_locale ?? {})
            .sort((a, b) => (b[1] as number) - (a[1] as number))
            .slice(0, 8)
            .map(([locale, count]) => (
              <div key={locale} className="rounded-lg border p-3 text-sm">
                <div className="font-mono">{locale}</div>
                <div className="text-2xl font-bold">{count as number}</div>
              </div>
            ))}
        </div>
      </Card>

      <Card title="Feedback queue" icon={MessageSquare}>
        <div className="grid grid-cols-2 gap-4">
          <Stat label="Pending" value={stats.feedback_pending} />
          <Stat
            label="Critical"
            value={stats.feedback_critical}
            alert={stats.feedback_critical > 0}
          />
        </div>
      </Card>

      <Card title="Errors (24h)" icon={AlertCircle}>
        <div className="grid grid-cols-2 gap-4">
          <Stat label="JS errors" value={stats.errors_24h} />
          <Stat
            label="Rust panics"
            value={stats.panics_24h}
            alert={stats.panics_24h > 0}
          />
        </div>
      </Card>
    </div>
  );
}

function KPI({
  label,
  value,
  icon: Icon,
  alert,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  alert?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-4 ${
        alert ? "border-red-500 bg-red-50 dark:bg-red-950/20" : ""
      }`}
    >
      <div className="flex items-center gap-2 mb-1 text-sm text-muted-foreground">
        <Icon className="size-4" />
        {label}
      </div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}

function Card({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon?: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border p-6">
      <div className="flex items-center gap-2 mb-4">
        {Icon && <Icon className="size-5 text-muted-foreground" />}
        <h2 className="font-semibold">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function OSCard({
  os,
  total,
  active,
  note,
}: {
  os: string;
  total: number;
  active: number;
  note?: string;
}) {
  return (
    <div className="rounded-lg border p-4">
      <div className="text-sm text-muted-foreground capitalize">{os}</div>
      <div className="text-2xl font-bold mt-1">{total}</div>
      <div className="text-xs text-muted-foreground mt-0.5">
        {active} active 24h
      </div>
      {note && (
        <div className="text-xs text-amber-600 dark:text-amber-400 mt-1">
          {note}
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  alert,
}: {
  label: string;
  value: number;
  alert?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-4 ${
        alert ? "border-red-500 bg-red-50 dark:bg-red-950/20" : ""
      }`}
    >
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </div>
  );
}
