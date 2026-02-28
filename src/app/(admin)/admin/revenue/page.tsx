import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { plans, type PlanId } from "@/config/plans";
import { DollarSign, TrendingUp, Users, CreditCard } from "lucide-react";

export default async function AdminRevenuePage() {
  const supabase = createAdminClient();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("plan_id");

  const { data: subscriptions } = await supabase
    .from("subscriptions")
    .select("plan_id, status, current_period_end, cancel_at_period_end");

  // Count users per plan
  const planCounts: Record<string, number> = {};
  for (const p of profiles ?? []) {
    planCounts[p.plan_id] = (planCounts[p.plan_id] || 0) + 1;
  }

  // Active paid subscribers
  const activeSubs = (subscriptions ?? []).filter(
    (s) => s.status === "active" && s.plan_id !== "free"
  );

  // MRR
  const mrr = activeSubs.reduce((sum, sub) => {
    const plan = plans[sub.plan_id as PlanId];
    return sum + (plan?.monthlyPrice ?? 0);
  }, 0);

  // ARR
  const arr = mrr * 12;

  // Churn risk (cancel_at_period_end = true)
  const churning = (subscriptions ?? []).filter(
    (s) => s.cancel_at_period_end
  ).length;

  // Past due
  const pastDue = (subscriptions ?? []).filter(
    (s) => s.status === "past_due"
  ).length;

  const totalPaid = activeSubs.length;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Revenue</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              MRR
            </CardTitle>
            <DollarSign className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">${mrr.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Monthly recurring revenue
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              ARR
            </CardTitle>
            <TrendingUp className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              ${arr.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Annual run rate
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Paid Subscribers
            </CardTitle>
            <Users className="h-5 w-5 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalPaid}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Active paid plans
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              At Risk
            </CardTitle>
            <CreditCard className="h-5 w-5 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{churning + pastDue}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {churning} canceling, {pastDue} past due
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Subscribers by Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">Plan</th>
                  <th className="px-4 py-3 text-left font-medium">Price</th>
                  <th className="px-4 py-3 text-left font-medium">Users</th>
                  <th className="px-4 py-3 text-left font-medium">Revenue</th>
                  <th className="px-4 py-3 text-left font-medium">% of Users</th>
                </tr>
              </thead>
              <tbody>
                {(Object.keys(plans) as PlanId[]).map((planId) => {
                  const plan = plans[planId];
                  const count = planCounts[planId] || 0;
                  const revenue = planId === "free" ? 0 : count * plan.monthlyPrice;
                  const totalUsers = profiles?.length ?? 1;
                  const pct = Math.round((count / totalUsers) * 100);
                  return (
                    <tr key={planId} className="border-b last:border-0">
                      <td className="px-4 py-3">
                        <Badge variant="secondary">{plan.name}</Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {plan.monthlyPrice === 0
                          ? "Free"
                          : `$${plan.monthlyPrice}/mo`}
                      </td>
                      <td className="px-4 py-3 font-medium">{count}</td>
                      <td className="px-4 py-3 font-medium">
                        ${revenue.toLocaleString()}/mo
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-20 rounded-full bg-muted">
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
        </CardContent>
      </Card>
    </div>
  );
}
