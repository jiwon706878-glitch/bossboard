"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAdminLang } from "@/lib/admin-i18n";
import { plans, type PlanId } from "@/config/plans";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign,
  TrendingDown,
  TrendingUp,
  Users,
  Key,
} from "lucide-react";
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
  Legend,
} from "recharts";

const COST_PER_CREDIT = 0.02;
const STORAGE_COST_PER_GB = 0.005;
const EGRESS_COST_PER_GB = 0.01;
const FIXED_MONTHLY_COST = 45;

const PIE_COLORS = ["#8B95B0", "#4F8BFF", "#34D399", "#FBBF24"];

interface AIUsageRow {
  user_id: string;
  business_id: string;
  feature: string;
  credits_used: number;
  created_at: string;
}

interface BusinessRow {
  id: string;
  name: string;
  plan_id: string;
  created_at: string;
  ai_provider: { provider?: string } | null;
}

interface CreditBalanceRow {
  business_id: string;
  credits_monthly: number;
  credits_monthly_used: number;
  credits_purchased: number;
  credits_purchased_used: number;
}

interface EgressRow {
  business_id: string;
  year_month: string;
  bytes_downloaded: number;
}

interface MemberRow {
  business_id: string;
  user_id: string;
}

function startOfMonthISO(offsetMonths = 0): string {
  const d = new Date();
  return new Date(
    d.getFullYear(),
    d.getMonth() - offsetMonths,
    1
  ).toISOString();
}

function monthLabel(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

function yearMonthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function AdminCostsPage() {
  const { t } = useAdminLang();
  const [loading, setLoading] = useState(true);
  const [aiUsage, setAiUsage] = useState<AIUsageRow[]>([]);
  const [businesses, setBusinesses] = useState<BusinessRow[]>([]);
  const [balances, setBalances] = useState<CreditBalanceRow[]>([]);
  const [egress, setEgress] = useState<EgressRow[]>([]);
  const [members, setMembers] = useState<MemberRow[]>([]);

  useEffect(() => {
    async function load() {
      const supabase = createClient();

      // Pull last 6 months of usage
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const [usageRes, bizRes, balRes, egressRes, memRes] = await Promise.all([
        supabase
          .from("ai_usage")
          .select("user_id, business_id, feature, credits_used, created_at")
          .gte("created_at", sixMonthsAgo.toISOString())
          .order("created_at", { ascending: false })
          .limit(20000),
        supabase
          .from("businesses")
          .select("id, name, plan_id, created_at, ai_provider"),
        supabase
          .from("credit_balances")
          .select(
            "business_id, credits_monthly, credits_monthly_used, credits_purchased, credits_purchased_used"
          ),
        supabase
          .from("egress_usage")
          .select("business_id, year_month, bytes_downloaded"),
        supabase.from("business_members").select("business_id, user_id"),
      ]);

      setAiUsage((usageRes.data as AIUsageRow[]) ?? []);
      setBusinesses((bizRes.data as BusinessRow[]) ?? []);
      setBalances((balRes.data as CreditBalanceRow[]) ?? []);
      setEgress((egressRes.data as EgressRow[]) ?? []);
      setMembers((memRes.data as MemberRow[]) ?? []);
      setLoading(false);
    }
    load();
  }, []);

  const startOfMonth = useMemo(() => startOfMonthISO(0), []);
  const currentYearMonth = useMemo(() => yearMonthKey(new Date()), []);

  // Revenue this month
  const revenueThisMonth = useMemo(() => {
    let total = 0;
    for (const biz of businesses) {
      const plan = plans[biz.plan_id as PlanId];
      if (plan) total += plan.monthlyPrice;
    }
    return total;
  }, [businesses]);

  // Cost this month (AI only for top card - full breakdown in chart)
  const aiCostThisMonth = useMemo(() => {
    const credits = aiUsage
      .filter((u) => u.created_at >= startOfMonth)
      .reduce((s, r) => s + r.credits_used, 0);
    return credits * COST_PER_CREDIT;
  }, [aiUsage, startOfMonth]);

  const egressThisMonth = useMemo(() => {
    let gb = 0;
    for (const row of egress) {
      if (row.year_month === currentYearMonth) {
        gb += (row.bytes_downloaded || 0) / (1024 * 1024 * 1024);
      }
    }
    return gb;
  }, [egress, currentYearMonth]);

  const storageCostThisMonth = useMemo(() => {
    // Estimate storage: plan-based allocation as proxy (since no storage_gb column)
    let totalGb = 0;
    for (const biz of businesses) {
      const plan = plans[biz.plan_id as PlanId];
      if (plan) totalGb += plan.limits.storageGb * 0.3; // assume 30% avg utilization
    }
    return totalGb * STORAGE_COST_PER_GB;
  }, [businesses]);

  const totalCostThisMonth =
    aiCostThisMonth +
    storageCostThisMonth +
    egressThisMonth * EGRESS_COST_PER_GB +
    FIXED_MONTHLY_COST;

  const margin =
    revenueThisMonth > 0
      ? ((revenueThisMonth - totalCostThisMonth) / revenueThisMonth) * 100
      : 0;

  // Active users = distinct user_id in last 7 days
  const activeUsers7d = useMemo(() => {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const ids = new Set(
      aiUsage.filter((u) => u.created_at >= weekAgo).map((u) => u.user_id)
    );
    return ids.size;
  }, [aiUsage]);

  // Cost breakdown by month (last 6 months, stacked)
  const costBreakdownData = useMemo(() => {
    const result: Array<{
      month: string;
      ai: number;
      storage: number;
      egress: number;
      fixed: number;
    }> = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      const ym = yearMonthKey(d);

      const aiCredits = aiUsage
        .filter((u) => {
          const dt = new Date(u.created_at);
          return dt >= monthStart && dt < monthEnd;
        })
        .reduce((s, r) => s + r.credits_used, 0);

      const egressGb = egress
        .filter((e) => e.year_month === ym)
        .reduce(
          (s, r) => s + (r.bytes_downloaded || 0) / (1024 * 1024 * 1024),
          0
        );

      // Storage cost estimate based on current businesses (proxy)
      const storageGb = businesses.reduce((s, b) => {
        const plan = plans[b.plan_id as PlanId];
        return s + (plan ? plan.limits.storageGb * 0.3 : 0);
      }, 0);

      result.push({
        month: monthLabel(d),
        ai: Math.round(aiCredits * COST_PER_CREDIT * 100) / 100,
        storage: Math.round(storageGb * STORAGE_COST_PER_GB * 100) / 100,
        egress: Math.round(egressGb * EGRESS_COST_PER_GB * 100) / 100,
        fixed: FIXED_MONTHLY_COST,
      });
    }
    return result;
  }, [aiUsage, egress, businesses]);

  // Revenue by plan (pie)
  const revenueByPlan = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const b of businesses) {
      counts[b.plan_id] = (counts[b.plan_id] || 0) + 1;
    }
    return (Object.keys(plans) as PlanId[]).map((pid) => {
      const plan = plans[pid];
      const count = counts[pid] || 0;
      return {
        name: plan.name,
        count,
        value: plan.monthlyPrice * count,
      };
    });
  }, [businesses]);

  // Top businesses by credit usage this month
  const topBusinesses = useMemo(() => {
    const mtd = aiUsage.filter((u) => u.created_at >= startOfMonth);
    const byBiz: Record<string, number> = {};
    for (const row of mtd) {
      if (row.business_id) {
        byBiz[row.business_id] = (byBiz[row.business_id] || 0) + row.credits_used;
      }
    }

    const bizMap = new Map(businesses.map((b) => [b.id, b]));
    const balanceMap = new Map(balances.map((b) => [b.business_id, b]));

    // Member count per business
    const memberCounts: Record<string, number> = {};
    for (const m of members) {
      memberCounts[m.business_id] = (memberCounts[m.business_id] || 0) + 1;
    }

    return Object.entries(byBiz)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id, credits]) => {
        const biz = bizMap.get(id);
        const plan = biz ? plans[biz.plan_id as PlanId] : null;
        const bal = balanceMap.get(id);
        const limit = plan?.limits.aiCredits ?? 0;
        const estCost = credits * COST_PER_CREDIT;
        const revenue = plan?.monthlyPrice ?? 0;
        const bizMargin =
          revenue > 0 ? ((revenue - estCost) / revenue) * 100 : 0;
        const storageGb = plan ? plan.limits.storageGb * 0.3 : 0;

        return {
          id,
          name: biz?.name ?? id.slice(0, 8),
          planName: plan?.name ?? biz?.plan_id ?? "-",
          teamSize: memberCounts[id] || 0,
          credits,
          creditsLimit: limit,
          creditsMonthlyUsed: bal?.credits_monthly_used ?? credits,
          storageGb,
          estCost,
          revenue,
          margin: bizMargin,
        };
      });
  }, [aiUsage, businesses, balances, members, startOfMonth]);

  // BYOK stats
  const byokStats = useMemo(() => {
    const total = businesses.length;
    const byok = businesses.filter(
      (b) => b.ai_provider && b.ai_provider.provider && b.ai_provider.provider !== "bossboard"
    ).length;
    const pct = total > 0 ? Math.round((byok / total) * 100) : 0;
    return { total, byok, pct };
  }, [businesses]);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">{t("costs")}</h1>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="py-8">
                <div className="h-8 w-24 animate-pulse rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardContent className="py-16">
              <div className="h-48 animate-pulse rounded bg-muted" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-16">
              <div className="h-48 animate-pulse rounded bg-muted" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{t("costs")}</h1>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("revenue_this_month")}
            </CardTitle>
            <DollarSign className="h-5 w-5 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono tabular-nums">
              ${revenueThisMonth.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {businesses.length} {t("business").toLowerCase()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("cost_this_month")}
            </CardTitle>
            <TrendingDown className="h-5 w-5 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono tabular-nums">
              ${totalCostThisMonth.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              AI ${aiCostThisMonth.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("margin")}
            </CardTitle>
            <TrendingUp
              className={`h-5 w-5 ${
                margin >= 50
                  ? "text-emerald-500"
                  : margin >= 30
                    ? "text-amber-500"
                    : "text-red-500"
              }`}
            />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono tabular-nums">
              {margin.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              ${(revenueThisMonth - totalCostThisMonth).toFixed(0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("active_users")}
            </CardTitle>
            <Users className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono tabular-nums">
              {activeUsers7d}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t("this_week")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Cost breakdown stacked bar */}
        <Card>
          <CardHeader>
            <CardTitle>{t("cost_breakdown")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={costBreakdownData}>
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11 }}
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
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="ai" stackId="a" fill="#4F8BFF" name="AI" />
                  <Bar
                    dataKey="storage"
                    stackId="a"
                    fill="#34D399"
                    name={t("storage")}
                  />
                  <Bar
                    dataKey="egress"
                    stackId="a"
                    fill="#FBBF24"
                    name="Egress"
                  />
                  <Bar
                    dataKey="fixed"
                    stackId="a"
                    fill="#8B95B0"
                    name="Fixed"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Revenue by plan pie */}
        <Card>
          <CardHeader>
            <CardTitle>{t("revenue_by_plan")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72 flex items-center justify-center">
              {revenueByPlan.every((r) => r.value === 0) ? (
                <p className="text-sm text-muted-foreground">{t("no_data")}</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={revenueByPlan.filter((r) => r.value > 0)}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                      nameKey="name"
                      label={(props: {
                        name?: string;
                        count?: number;
                      }) => `${props.name ?? ""} (${props.count ?? 0})`}
                    >
                      {revenueByPlan
                        .filter((r) => r.value > 0)
                        .map((_, idx) => (
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
          <CardTitle>{t("top_businesses")}</CardTitle>
        </CardHeader>
        <CardContent>
          {topBusinesses.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("no_data")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium">
                      {t("business")}
                    </th>
                    <th className="px-4 py-3 text-left font-medium">
                      {t("plan")}
                    </th>
                    <th className="px-4 py-3 text-left font-medium">
                      {t("team_size")}
                    </th>
                    <th className="px-4 py-3 text-left font-medium">
                      {t("credits_used")}
                    </th>
                    <th className="px-4 py-3 text-left font-medium">
                      {t("storage")}
                    </th>
                    <th className="px-4 py-3 text-left font-medium">
                      {t("estimated_cost")}
                    </th>
                    <th className="px-4 py-3 text-left font-medium">
                      {t("margin")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {topBusinesses.map((biz) => {
                    const marginColor =
                      biz.margin < 30
                        ? "bg-red-500/10 text-red-500 border-red-500/20"
                        : biz.margin < 50
                          ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                          : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
                    return (
                      <tr
                        key={biz.id}
                        className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-4 py-3 font-medium">
                          <Link
                            href={`/admin/costs/${biz.id}`}
                            className="hover:underline"
                          >
                            {biz.name}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="secondary">{biz.planName}</Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground font-mono tabular-nums">
                          {biz.teamSize}
                        </td>
                        <td className="px-4 py-3 font-mono tabular-nums">
                          {biz.credits.toLocaleString()}
                          {biz.creditsLimit > 0 && (
                            <span className="text-muted-foreground">
                              {" / "}
                              {biz.creditsLimit.toLocaleString()}
                            </span>
                          )}
                          {biz.creditsLimit === -1 && (
                            <span className="text-muted-foreground"> / ∞</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground font-mono tabular-nums">
                          {biz.storageGb.toFixed(1)} GB
                        </td>
                        <td className="px-4 py-3 font-mono tabular-nums">
                          ${biz.estCost.toFixed(2)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${marginColor}`}
                          >
                            {biz.margin.toFixed(0)}%
                          </span>
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

      {/* BYOK section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            {t("byok_status")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-3">
            <div className="text-3xl font-bold font-mono tabular-nums">
              {byokStats.byok}
            </div>
            <div className="text-muted-foreground">
              / {byokStats.total} ({byokStats.pct}%)
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            {t("byok_businesses")}
          </p>
          <p className="text-xs text-muted-foreground mt-3 italic">
            Detailed BYOK call tracking coming soon
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
