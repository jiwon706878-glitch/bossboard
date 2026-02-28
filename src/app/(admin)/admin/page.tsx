import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, DollarSign, Sparkles, Building2 } from "lucide-react";
import { plans } from "@/config/plans";

export default async function AdminOverviewPage() {
  const supabase = createAdminClient();

  const [profilesRes, businessesRes, usageRes, subsRes] = await Promise.all([
    supabase.from("profiles").select("id, plan_id, created_at", { count: "exact" }),
    supabase.from("businesses").select("id", { count: "exact", head: true }),
    supabase.from("ai_usage").select("credits_used"),
    supabase.from("subscriptions").select("plan_id, status").eq("status", "active"),
  ]);

  const totalUsers = profilesRes.count ?? 0;
  const totalBusinesses = businessesRes.count ?? 0;
  const totalAiCalls = usageRes.data?.reduce((s, r) => s + r.credits_used, 0) ?? 0;

  // MRR calculation
  const activeSubs = subsRes.data ?? [];
  const mrr = activeSubs.reduce((sum, sub) => {
    const plan = plans[sub.plan_id as keyof typeof plans];
    return sum + (plan?.monthlyPrice ?? 0);
  }, 0);

  // Plan distribution
  const planCounts: Record<string, number> = {};
  for (const p of profilesRes.data ?? []) {
    planCounts[p.plan_id] = (planCounts[p.plan_id] || 0) + 1;
  }

  // Signups last 7 days
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const recentSignups = (profilesRes.data ?? []).filter(
    (p) => p.created_at >= weekAgo
  ).length;

  const stats = [
    { title: "Total Users", value: totalUsers, sub: `${recentSignups} this week`, icon: Users, color: "text-blue-500" },
    { title: "MRR", value: `$${mrr}`, sub: `${activeSubs.length} active subscriptions`, icon: DollarSign, color: "text-green-500" },
    { title: "Total AI Calls", value: totalAiCalls.toLocaleString(), sub: "All time", icon: Sparkles, color: "text-purple-500" },
    { title: "Businesses", value: totalBusinesses, sub: "Registered", icon: Building2, color: "text-amber-500" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Admin Overview</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{stat.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Users by Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(planCounts).map(([planId, count]) => {
              const plan = plans[planId as keyof typeof plans];
              const pct = totalUsers > 0 ? Math.round((count / totalUsers) * 100) : 0;
              return (
                <div key={planId} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{plan?.name ?? planId}</span>
                    <span className="text-muted-foreground">{count} ({pct}%)</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-primary transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
