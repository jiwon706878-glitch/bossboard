"use client";

import { useEffect, useMemo, useState, use } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAdminLang } from "@/lib/admin-i18n";
import { plans, type PlanId } from "@/config/plans";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const COST_PER_CREDIT = 0.02;
const STORAGE_COST_PER_GB = 0.005;
const EGRESS_COST_PER_GB = 0.01;

const PIE_COLORS = ["#4F8BFF", "#34D399", "#FBBF24", "#8B95B0"];

const ACTION_TYPES: Record<string, "light" | "standard" | "heavy"> = {
  chat: "light",
  smart_search_ai: "light",
  tab_ai_question: "light",
  receipt_ocr: "light",
  sop_generate: "standard",
  sop_reformat: "standard",
  file_convert: "standard",
  checklist_generate: "standard",
  onboarding_generate: "heavy",
  monthly_report: "heavy",
};

interface BusinessRow {
  id: string;
  name: string;
  plan_id: string;
  created_at: string;
  user_id: string;
  ai_provider: { provider?: string } | null;
}

interface BalanceRow {
  business_id: string;
  credits_monthly: number;
  credits_monthly_used: number;
  credits_purchased: number;
  credits_purchased_used: number;
}

interface UsageRow {
  user_id: string;
  feature: string;
  credits_used: number;
  created_at: string;
}

interface EgressRow {
  business_id: string;
  year_month: string;
  bytes_downloaded: number;
}

interface ProfileRow {
  id: string;
  full_name: string | null;
  email: string;
}

interface MemberRow {
  business_id: string;
  user_id: string;
  role: string;
}

function yearMonthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function AdminCostBusinessDetailPage({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = use(params);
  const { t } = useAdminLang();

  const [loading, setLoading] = useState(true);
  const [business, setBusiness] = useState<BusinessRow | null>(null);
  const [balance, setBalance] = useState<BalanceRow | null>(null);
  const [usage, setUsage] = useState<UsageRow[]>([]);
  const [egress, setEgress] = useState<EgressRow[]>([]);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const [bizRes, balRes, usageRes, egressRes, memRes] = await Promise.all([
        supabase
          .from("businesses")
          .select("id, name, plan_id, created_at, user_id, ai_provider")
          .eq("id", businessId)
          .single(),
        supabase
          .from("credit_balances")
          .select(
            "business_id, credits_monthly, credits_monthly_used, credits_purchased, credits_purchased_used"
          )
          .eq("business_id", businessId)
          .maybeSingle(),
        supabase
          .from("ai_usage")
          .select("user_id, feature, credits_used, created_at")
          .eq("business_id", businessId)
          .gte("created_at", startOfMonth.toISOString()),
        supabase
          .from("egress_usage")
          .select("business_id, year_month, bytes_downloaded")
          .eq("business_id", businessId),
        supabase
          .from("business_members")
          .select("business_id, user_id, role")
          .eq("business_id", businessId),
      ]);

      setBusiness((bizRes.data as BusinessRow) ?? null);
      setBalance((balRes.data as BalanceRow) ?? null);
      setUsage((usageRes.data as UsageRow[]) ?? []);
      setEgress((egressRes.data as EgressRow[]) ?? []);
      setMembers((memRes.data as MemberRow[]) ?? []);

      // Resolve profile names for all users we see
      const userIds = new Set<string>();
      for (const u of usageRes.data ?? []) userIds.add((u as UsageRow).user_id);
      for (const m of memRes.data ?? [])
        userIds.add((m as MemberRow).user_id);
      if (bizRes.data) userIds.add((bizRes.data as BusinessRow).user_id);

      if (userIds.size > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", Array.from(userIds));
        setProfiles((profs as ProfileRow[]) ?? []);
      }

      setLoading(false);
    }
    load();
  }, [businessId]);

  const profileMap = useMemo(
    () => new Map(profiles.map((p) => [p.id, p])),
    [profiles]
  );

  const plan = useMemo(
    () => (business ? plans[business.plan_id as PlanId] : null),
    [business]
  );

  const creditsUsedMTD = useMemo(
    () => usage.reduce((s, r) => s + r.credits_used, 0),
    [usage]
  );

  const currentYearMonth = yearMonthKey(new Date());
  const egressGbMTD = useMemo(() => {
    const row = egress.find((e) => e.year_month === currentYearMonth);
    return row ? (row.bytes_downloaded || 0) / (1024 * 1024 * 1024) : 0;
  }, [egress, currentYearMonth]);

  // Proxy storage: plan allocation * 30% (no storage_gb column in businesses)
  const storageGbUsed = useMemo(
    () => (plan ? plan.limits.storageGb * 0.3 : 0),
    [plan]
  );

  const aiCost = creditsUsedMTD * COST_PER_CREDIT;
  const storageCost = storageGbUsed * STORAGE_COST_PER_GB;
  const egressCost = egressGbMTD * EGRESS_COST_PER_GB;
  const totalCost = aiCost + storageCost + egressCost;
  const revenue = plan?.monthlyPrice ?? 0;
  const marginPct =
    revenue > 0 ? ((revenue - totalCost) / revenue) * 100 : 0;

  // Per-user usage table
  const topUsers = useMemo(() => {
    const byUser: Record<
      string,
      { credits: number; features: Record<string, number> }
    > = {};

    for (const row of usage) {
      if (!byUser[row.user_id]) {
        byUser[row.user_id] = { credits: 0, features: {} };
      }
      byUser[row.user_id].credits += row.credits_used;
      byUser[row.user_id].features[row.feature] =
        (byUser[row.user_id].features[row.feature] || 0) + row.credits_used;
    }

    return Object.entries(byUser)
      .sort((a, b) => b[1].credits - a[1].credits)
      .slice(0, 20)
      .map(([userId, data]) => {
        const prof = profileMap.get(userId);
        // Find main action: feature with highest credits
        let mainAction = "-";
        let maxCredits = 0;
        for (const [feat, creds] of Object.entries(data.features)) {
          if (creds > maxCredits) {
            maxCredits = creds;
            mainAction = feat;
          }
        }
        return {
          userId,
          name: prof?.full_name || prof?.email || userId.slice(0, 8),
          credits: data.credits,
          cost: data.credits * COST_PER_CREDIT,
          mainAction,
        };
      });
  }, [usage, profileMap]);

  // Action type distribution
  const actionTypeData = useMemo(() => {
    const buckets: Record<"light" | "standard" | "heavy" | "other", number> = {
      light: 0,
      standard: 0,
      heavy: 0,
      other: 0,
    };

    for (const row of usage) {
      const type = ACTION_TYPES[row.feature];
      if (type) {
        buckets[type] += row.credits_used;
      } else {
        buckets.other += row.credits_used;
      }
    }

    return (
      [
        { key: "light", name: t("light_actions"), value: buckets.light },
        {
          key: "standard",
          name: t("standard_actions"),
          value: buckets.standard,
        },
        { key: "heavy", name: t("heavy_actions"), value: buckets.heavy },
        { key: "other", name: t("others"), value: buckets.other },
      ] as { key: string; name: string; value: number }[]
    ).filter((x) => x.value > 0);
  }, [usage, t]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
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

  if (!business) {
    return (
      <div className="space-y-6">
        <Link
          href="/admin/costs"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> {t("costs")}
        </Link>
        <p className="text-sm text-muted-foreground">{t("no_data")}</p>
      </div>
    );
  }

  const creditsLimit = plan?.limits.aiCredits ?? 0;
  const creditsPct =
    creditsLimit > 0
      ? Math.min(100, (creditsUsedMTD / creditsLimit) * 100)
      : 0;
  const storagePct = plan
    ? Math.min(100, (storageGbUsed / plan.limits.storageGb) * 100)
    : 0;
  const egressPct = plan
    ? Math.min(100, (egressGbMTD / plan.limits.egressGbPerMonth) * 100)
    : 0;

  const marginColor =
    marginPct < 30
      ? "bg-red-500/10 text-red-500 border-red-500/20"
      : marginPct < 50
        ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
        : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";

  return (
    <div className="space-y-6">
      <Link
        href="/admin/costs"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> {t("costs")}
      </Link>

      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-3xl font-bold">{business.name}</h1>
          <Badge variant="secondary">{plan?.name ?? business.plan_id}</Badge>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
          <span>
            {t("joined")}:{" "}
            {new Date(business.created_at).toLocaleDateString()}
          </span>
          <span>
            {t("members")}: {members.length}
          </span>
        </div>
      </div>

      {/* Usage cards */}
      <div>
        <h2 className="text-lg font-semibold mb-3">{t("monthly_usage")}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("credits")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono tabular-nums">
                {creditsUsedMTD.toLocaleString()}
                <span className="text-muted-foreground text-base font-normal">
                  {creditsLimit === -1
                    ? " / ∞"
                    : ` / ${creditsLimit.toLocaleString()}`}
                </span>
              </div>
              {creditsLimit > 0 && (
                <div className="mt-3 h-2 w-full rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-primary"
                    style={{ width: `${creditsPct}%` }}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("storage")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono tabular-nums">
                {storageGbUsed.toFixed(1)}
                <span className="text-muted-foreground text-base font-normal">
                  {" "}
                  / {plan?.limits.storageGb ?? 0} GB
                </span>
              </div>
              <div className="mt-3 h-2 w-full rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-emerald-500"
                  style={{ width: `${storagePct}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("downloads")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono tabular-nums">
                {egressGbMTD.toFixed(1)}
                <span className="text-muted-foreground text-base font-normal">
                  {" "}
                  / {plan?.limits.egressGbPerMonth ?? 0} GB
                </span>
              </div>
              <div className="mt-3 h-2 w-full rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-amber-500"
                  style={{ width: `${egressPct}%` }}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Cost breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>{t("cost_breakdown")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <div className="text-xs text-muted-foreground mb-1">
                {t("ai_cost_estimated")}
              </div>
              <div className="text-xl font-bold font-mono tabular-nums">
                ${aiCost.toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">
                {t("storage_cost")}
              </div>
              <div className="text-xl font-bold font-mono tabular-nums">
                ${storageCost.toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">
                {t("egress_cost")}
              </div>
              <div className="text-xl font-bold font-mono tabular-nums">
                ${egressCost.toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">
                {t("total_cost")}
              </div>
              <div className="text-xl font-bold font-mono tabular-nums">
                ${totalCost.toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">
                {t("revenue_label")} / {t("margin_label")}
              </div>
              <div className="text-xl font-bold font-mono tabular-nums">
                ${revenue}
              </div>
              <span
                className={`mt-1 inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${marginColor}`}
              >
                {marginPct.toFixed(0)}%
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Two column: top users + action distribution */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t("credit_usage_detail")}</CardTitle>
          </CardHeader>
          <CardContent>
            {topUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("no_data")}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-3 text-left font-medium">
                        {t("user")}
                      </th>
                      <th className="px-4 py-3 text-left font-medium">
                        {t("usage")}
                      </th>
                      <th className="px-4 py-3 text-left font-medium">
                        {t("cost")}
                      </th>
                      <th className="px-4 py-3 text-left font-medium">
                        {t("main_action")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {topUsers.map((u) => (
                      <tr
                        key={u.userId}
                        className="border-b last:border-0"
                      >
                        <td className="px-4 py-3 font-medium">{u.name}</td>
                        <td className="px-4 py-3 font-mono tabular-nums">
                          {u.credits.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 font-mono tabular-nums text-muted-foreground">
                          ${u.cost.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          <code className="text-xs">{u.mainAction}</code>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("action_type_distribution")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72 flex items-center justify-center">
              {actionTypeData.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("no_data")}</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={actionTypeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                      nameKey="name"
                    >
                      {actionTypeData.map((_, idx) => (
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
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
