import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, DollarSign, TrendingUp, Zap } from "lucide-react";

// Rough cost estimates per AI call (Claude Sonnet input+output)
const COST_PER_CALL = 0.015; // ~$0.015 average per call

export default async function AdminUsagePage() {
  const supabase = createAdminClient();

  // All usage data
  const { data: usage } = await supabase
    .from("ai_usage")
    .select("user_id, credits_used, feature, created_at")
    .order("created_at", { ascending: false });

  const allUsage = usage ?? [];

  // Total calls and credits
  const totalCalls = allUsage.length;
  const totalCredits = allUsage.reduce((s, r) => s + r.credits_used, 0);
  const estimatedCost = totalCredits * COST_PER_CALL;

  // This month
  const startOfMonth = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1
  ).toISOString();
  const thisMonth = allUsage.filter((u) => u.created_at >= startOfMonth);
  const monthlyCredits = thisMonth.reduce((s, r) => s + r.credits_used, 0);
  const monthlyCost = monthlyCredits * COST_PER_CALL;

  // By feature
  const byFeature: Record<string, number> = {};
  for (const row of allUsage) {
    byFeature[row.feature] = (byFeature[row.feature] || 0) + row.credits_used;
  }

  const featureLabels: Record<string, string> = {
    review_reply: "Review Replies",
    caption: "Social Captions",
    script: "Video Scripts",
  };

  // Top users by usage
  const byUser: Record<string, number> = {};
  for (const row of allUsage) {
    byUser[row.user_id] = (byUser[row.user_id] || 0) + row.credits_used;
  }
  const topUserIds = Object.entries(byUser)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  // Fetch user emails for top users
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in(
      "id",
      topUserIds.map((u) => u[0])
    );

  const {
    data: { users: authUsers },
  } = await supabase.auth.admin.listUsers({ perPage: 1000 });

  const topUsers = topUserIds.map(([userId, credits]) => {
    const profile = profiles?.find((p) => p.id === userId);
    const authUser = authUsers?.find((u) => u.id === userId);
    return {
      id: userId,
      name: profile?.full_name || "No name",
      email: authUser?.email || "unknown",
      credits,
      cost: credits * COST_PER_CALL,
    };
  });

  // Daily usage last 30 days
  const thirtyDaysAgo = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000
  ).toISOString();
  const recentUsage = allUsage.filter((u) => u.created_at >= thirtyDaysAgo);
  const dailyUsage: Record<string, number> = {};
  for (const row of recentUsage) {
    const day = new Date(row.created_at).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    dailyUsage[day] = (dailyUsage[day] || 0) + row.credits_used;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">AI Usage Stats</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total API Calls
            </CardTitle>
            <Zap className="h-5 w-5 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {totalCalls.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalCredits.toLocaleString()} credits used
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Est. Total Cost
            </CardTitle>
            <DollarSign className="h-5 w-5 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              ${estimatedCost.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              ~${COST_PER_CALL}/call avg
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              This Month
            </CardTitle>
            <TrendingUp className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {monthlyCredits.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              ~${monthlyCost.toFixed(2)} est. cost
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg/Day (30d)
            </CardTitle>
            <Sparkles className="h-5 w-5 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {Object.keys(dailyUsage).length > 0
                ? Math.round(
                    recentUsage.reduce((s, r) => s + r.credits_used, 0) /
                      Math.max(Object.keys(dailyUsage).length, 1)
                  )
                : 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              credits per active day
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Usage by feature */}
      <Card>
        <CardHeader>
          <CardTitle>Usage by Feature</CardTitle>
        </CardHeader>
        <CardContent>
          {Object.keys(byFeature).length === 0 ? (
            <p className="text-sm text-muted-foreground">No usage data yet.</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(byFeature)
                .sort((a, b) => b[1] - a[1])
                .map(([feature, credits]) => {
                  const pct =
                    totalCredits > 0
                      ? Math.round((credits / totalCredits) * 100)
                      : 0;
                  return (
                    <div key={feature} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">
                          {featureLabels[feature] || feature}
                        </span>
                        <span className="text-muted-foreground">
                          {credits.toLocaleString()} credits ({pct}%) —
                          ~${(credits * COST_PER_CALL).toFixed(2)}
                        </span>
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
          )}
        </CardContent>
      </Card>

      {/* Top users */}
      <Card>
        <CardHeader>
          <CardTitle>Top Users by Usage</CardTitle>
        </CardHeader>
        <CardContent>
          {topUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No usage data yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium">#</th>
                    <th className="px-4 py-3 text-left font-medium">User</th>
                    <th className="px-4 py-3 text-left font-medium">Credits</th>
                    <th className="px-4 py-3 text-left font-medium">
                      Est. Cost
                    </th>
                    <th className="px-4 py-3 text-left font-medium">
                      % of Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {topUsers.map((user, i) => {
                    const pct =
                      totalCredits > 0
                        ? Math.round((user.credits / totalCredits) * 100)
                        : 0;
                    return (
                      <tr key={user.id} className="border-b last:border-0">
                        <td className="px-4 py-3 text-muted-foreground">
                          {i + 1}
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium">{user.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {user.email}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-medium">
                          {user.credits.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          ${user.cost.toFixed(2)}
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
