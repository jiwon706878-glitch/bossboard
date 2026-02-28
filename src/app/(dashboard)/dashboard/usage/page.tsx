import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { plans, type PlanId } from "@/config/plans";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { UsageChart } from "@/components/dashboard/usage-chart";

export default async function UsagePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan_id")
    .eq("id", user.id)
    .single();

  const planId = (profile?.plan_id ?? "free") as PlanId;
  const plan = plans[planId];
  const limit = plan.limits.aiCredits;

  // Get monthly usage
  const startOfMonth = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1
  );

  const { data: usageData } = await supabase
    .from("ai_usage")
    .select("credits_used, feature, created_at")
    .eq("user_id", user.id)
    .gte("created_at", startOfMonth.toISOString())
    .order("created_at");

  const totalUsed =
    usageData?.reduce((sum, r) => sum + r.credits_used, 0) ?? 0;
  const remaining = limit === -1 ? Infinity : limit - totalUsed;
  const percentage = limit === -1 ? 0 : Math.round((totalUsed / limit) * 100);

  // Usage by feature
  const byFeature =
    usageData?.reduce(
      (acc, row) => {
        acc[row.feature] = (acc[row.feature] || 0) + row.credits_used;
        return acc;
      },
      {} as Record<string, number>
    ) ?? {};

  // Daily usage for chart
  const dailyUsage =
    usageData?.reduce(
      (acc, row) => {
        const day = new Date(row.created_at).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
        acc[day] = (acc[day] || 0) + row.credits_used;
        return acc;
      },
      {} as Record<string, number>
    ) ?? {};

  const chartData = Object.entries(dailyUsage).map(([date, credits]) => ({
    date,
    credits,
  }));

  const featureLabels: Record<string, string> = {
    review_reply: "Review Replies",
    caption: "Social Captions",
    script: "Video Scripts",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">AI Usage</h1>
        <p className="text-muted-foreground">
          Track your AI credit consumption this month.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {/* Credit Gauge */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Credits Used
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center">
              <div className="relative h-32 w-32">
                <svg className="h-32 w-32 -rotate-90" viewBox="0 0 120 120">
                  <circle
                    cx="60"
                    cy="60"
                    r="50"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="10"
                    className="text-muted"
                  />
                  <circle
                    cx="60"
                    cy="60"
                    r="50"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="10"
                    strokeDasharray={`${(percentage / 100) * 314} 314`}
                    className="text-primary transition-all"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold">{totalUsed}</span>
                  <span className="text-xs text-muted-foreground">
                    / {limit === -1 ? "∞" : limit}
                  </span>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <Badge variant="secondary">{plan.name} Plan</Badge>
                {remaining <= 5 && limit !== -1 && (
                  <Badge variant="destructive">Low credits</Badge>
                )}
              </div>
              {remaining <= 5 && limit !== -1 && (
                <Link href="/dashboard/billing" className="mt-3">
                  <Button size="sm" variant="outline" className="gap-1">
                    Upgrade <ArrowUpRight className="h-3 w-3" />
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Feature Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              By Feature
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(byFeature).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No usage data yet. Start generating content!
              </p>
            ) : (
              Object.entries(byFeature).map(([feature, count]) => (
                <div key={feature} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <Sparkles className="h-3 w-3 text-primary" />
                      {featureLabels[feature] || feature}
                    </span>
                    <span className="font-medium">{count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-primary transition-all"
                      style={{
                        width: `${Math.min(100, (count / totalUsed) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Plan Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Plan Limits
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">AI Credits</span>
              <span className="font-medium">
                {limit === -1 ? "Unlimited" : `${limit}/mo`}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Businesses</span>
              <span className="font-medium">{plan.limits.businesses}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Social Posts</span>
              <span className="font-medium">
                {plan.limits.socialPosts === -1
                  ? "Unlimited"
                  : `${plan.limits.socialPosts}/mo`}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Daily Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <UsageChart data={chartData} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
