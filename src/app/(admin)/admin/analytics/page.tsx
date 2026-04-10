"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { CREDIT_CONFIG, type ActionName } from "@/config/credits";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap, DollarSign, TrendingUp, Building2 } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const COST_PER_CREDIT = 0.015;

const PIE_COLORS = ["#4F8BFF", "#34D399", "#FBBF24", "#F87171", "#A78BFA"];

interface UsageRow {
  user_id: string;
  business_id: string;
  credits_used: number;
  feature: string;
  created_at: string;
}

interface BusinessRow {
  id: string;
  name: string;
}

export default function AdminAnalyticsPage() {
  const [usage, setUsage] = useState<UsageRow[]>([]);
  const [businesses, setBusinesses] = useState<BusinessRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();

      const [usageRes, bizRes] = await Promise.all([
        supabase
          .from("ai_usage")
          .select("user_id, business_id, credits_used, feature, created_at")
          .order("created_at", { ascending: false })
          .limit(10000),
        supabase.from("businesses").select("id, name"),
      ]);

      setUsage(usageRes.data ?? []);
      setBusinesses(bizRes.data ?? []);
      setLoading(false);
    }
    load();
  }, []);

  // Derived calculations
  const today = useMemo(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  }, []);

  const startOfMonth = useMemo(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
  }, []);

  const creditsToday = useMemo(
    () =>
      usage
        .filter((u) => u.created_at.startsWith(today))
        .reduce((s, r) => s + r.credits_used, 0),
    [usage, today]
  );

  const creditsMTD = useMemo(
    () =>
      usage
        .filter((u) => u.created_at >= startOfMonth)
        .reduce((s, r) => s + r.credits_used, 0),
    [usage, startOfMonth]
  );

  const estimatedCostMTD = creditsMTD * COST_PER_CREDIT;

  const activeBusinesses = useMemo(() => {
    const ids = new Set(
      usage.filter((u) => u.created_at >= startOfMonth).map((u) => u.business_id)
    );
    return ids.size;
  }, [usage, startOfMonth]);

  // Bar chart: credits by day (last 30 days)
  const dailyData = useMemo(() => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const buckets: Record<string, number> = {};

    for (const row of usage) {
      const d = new Date(row.created_at);
      if (d < thirtyDaysAgo) continue;
      const key = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      buckets[key] = (buckets[key] || 0) + row.credits_used;
    }

    // Build sorted array for last 30 days
    const result: { day: string; credits: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const key = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      result.push({ day: key, credits: buckets[key] || 0 });
    }
    return result;
  }, [usage]);

  // Pie chart: breakdown by action type (light/standard/heavy)
  const typeBreakdown = useMemo(() => {
    const buckets: Record<string, number> = { light: 0, standard: 0, heavy: 0, other: 0 };

    for (const row of usage) {
      const actionConfig = CREDIT_CONFIG.actions[row.feature as ActionName];
      if (actionConfig) {
        buckets[actionConfig.type] = (buckets[actionConfig.type] || 0) + row.credits_used;
      } else {
        buckets.other = (buckets.other || 0) + row.credits_used;
      }
    }

    return Object.entries(buckets)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
      }));
  }, [usage]);

  // Table: top 10 businesses by credit usage this month
  const topBusinesses = useMemo(() => {
    const mtdUsage = usage.filter((u) => u.created_at >= startOfMonth);
    const byBiz: Record<string, number> = {};

    for (const row of mtdUsage) {
      if (row.business_id) {
        byBiz[row.business_id] = (byBiz[row.business_id] || 0) + row.credits_used;
      }
    }

    const bizMap = new Map(businesses.map((b) => [b.id, b.name]));

    return Object.entries(byBiz)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id, credits], i) => ({
        rank: i + 1,
        id,
        name: bizMap.get(id) || id.slice(0, 8) + "...",
        credits,
        cost: credits * COST_PER_CREDIT,
      }));
  }, [usage, businesses, startOfMonth]);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Credit Analytics</h1>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="py-8">
                <div className="h-8 w-24 animate-pulse rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Credit Analytics</h1>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Credits Used Today
            </CardTitle>
            <Zap className="h-5 w-5 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{creditsToday.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Credits Used MTD
            </CardTitle>
            <TrendingUp className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{creditsMTD.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Estimated API Cost MTD
            </CardTitle>
            <DollarSign className="h-5 w-5 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">${estimatedCostMTD.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              ~${COST_PER_CREDIT}/credit
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Businesses
            </CardTitle>
            <Building2 className="h-5 w-5 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{activeBusinesses}</div>
            <p className="text-xs text-muted-foreground mt-1">this month</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Bar chart — 2/3 width */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Credits by Day (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyData}>
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 11 }}
                    interval="preserveStartEnd"
                    stroke="var(--text-tertiary, #5A6480)"
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    stroke="var(--text-tertiary, #5A6480)"
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--bg-secondary, #141824)",
                      border: "1px solid var(--border, #2A3050)",
                      borderRadius: 6,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="credits" fill="#4F8BFF" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Pie chart — 1/3 width */}
        <Card>
          <CardHeader>
            <CardTitle>By Action Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72 flex items-center justify-center">
              {typeBreakdown.length === 0 ? (
                <p className="text-sm text-muted-foreground">No data yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={typeBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                      nameKey="name"
                      label={(props: { name?: string; percent?: number }) =>
                        `${props.name ?? ""} ${((props.percent ?? 0) * 100).toFixed(0)}%`
                      }
                    >
                      {typeBreakdown.map((_, idx) => (
                        <Cell
                          key={idx}
                          fill={PIE_COLORS[idx % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "var(--bg-secondary, #141824)",
                        border: "1px solid var(--border, #2A3050)",
                        borderRadius: 6,
                        fontSize: 12,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top businesses table */}
      <Card>
        <CardHeader>
          <CardTitle>Top 10 Businesses by Credit Usage (This Month)</CardTitle>
        </CardHeader>
        <CardContent>
          {topBusinesses.length === 0 ? (
            <p className="text-sm text-muted-foreground">No usage data this month.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium">#</th>
                    <th className="px-4 py-3 text-left font-medium">Business</th>
                    <th className="px-4 py-3 text-left font-medium">Credits Used</th>
                    <th className="px-4 py-3 text-left font-medium">Est. Cost</th>
                    <th className="px-4 py-3 text-left font-medium">% of MTD</th>
                  </tr>
                </thead>
                <tbody>
                  {topBusinesses.map((biz) => {
                    const pct =
                      creditsMTD > 0
                        ? Math.round((biz.credits / creditsMTD) * 100)
                        : 0;
                    return (
                      <tr key={biz.id} className="border-b last:border-0">
                        <td className="px-4 py-3 text-muted-foreground">
                          {biz.rank}
                        </td>
                        <td className="px-4 py-3 font-medium">{biz.name}</td>
                        <td className="px-4 py-3 font-mono tabular-nums">
                          {biz.credits.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          ${biz.cost.toFixed(2)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-16 rounded-full bg-muted">
                              <div
                                className="h-2 rounded-full bg-primary"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {pct}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
