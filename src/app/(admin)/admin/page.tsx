import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, DollarSign, Sparkles, Building2, MessageSquare, Tag } from "lucide-react";
import { plans } from "@/config/plans";
import { AdminPageTitle } from "@/components/admin/admin-page-title";
import { getActivePromotion } from "@/lib/promotions";

export default async function AdminOverviewPage() {
  const supabase = createAdminClient();

  const [profilesRes, businessesRes, usageRes, subsRes, feedbackRes, unreadFeedbackRes, activePromo] = await Promise.all([
    supabase.from("profiles").select("id, plan_id, created_at", { count: "exact" }),
    supabase.from("businesses").select("id", { count: "exact", head: true }),
    supabase.from("ai_usage").select("credits_used"),
    supabase.from("subscriptions").select("plan_id, status").eq("status", "active"),
    supabase.from("feedback").select("id", { count: "exact", head: true }),
    supabase.from("feedback").select("id", { count: "exact", head: true }).eq("read", false),
    getActivePromotion(),
  ]);

  const totalUsers = profilesRes.count ?? 0;
  const totalBusinesses = businessesRes.count ?? 0;
  const totalAiCalls = usageRes.data?.reduce((s, r) => s + r.credits_used, 0) ?? 0;
  const totalFeedback = feedbackRes.count ?? 0;
  const unreadFeedback = unreadFeedbackRes.count ?? 0;

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
    { title: "Feedback", value: totalFeedback, sub: `${unreadFeedback} unread`, icon: MessageSquare, color: "text-pink-500" },
  ];

  return (
    <div className="space-y-6">
      <AdminPageTitle titleKey="overview" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
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
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Tag className="h-4 w-4" /> Active Promotion
            </span>
            <Link
              href="/admin/promotions"
              className="text-xs font-normal text-muted-foreground hover:text-foreground underline"
            >
              Manage →
            </Link>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activePromo ? (
            <>
              <div className="flex items-baseline justify-between">
                <span className="text-lg font-semibold">{activePromo.name}</span>
                <span className="text-sm font-medium text-green-600 dark:text-green-400">
                  {activePromo.discount_type === "percent"
                    ? `${activePromo.discount_value}% off`
                    : `$${activePromo.discount_value} off`}
                </span>
              </div>
              {activePromo.max_uses !== null && (
                <>
                  <div className="mt-2 flex items-baseline justify-between text-sm">
                    <span className="font-mono">
                      {activePromo.current_uses}
                      <span className="text-muted-foreground">
                        {" "}/ {activePromo.max_uses}
                      </span>
                    </span>
                    <span className="text-muted-foreground">
                      {Math.max(
                        0,
                        activePromo.max_uses - activePromo.current_uses
                      )}{" "}
                      remaining
                    </span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-primary transition-all"
                      style={{
                        width: `${Math.min(100, (activePromo.current_uses / activePromo.max_uses) * 100)}%`,
                      }}
                    />
                  </div>
                </>
              )}
              {activePromo.max_uses === null && (
                <p className="mt-2 text-sm text-muted-foreground">
                  Unlimited uses · {activePromo.current_uses} redeemed
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              No active promotion.{" "}
              <Link
                href="/admin/promotions"
                className="text-primary underline"
              >
                Create one →
              </Link>
            </p>
          )}
        </CardContent>
      </Card>

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
