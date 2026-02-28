import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Star, Share2, Video, Sparkles } from "lucide-react";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Check if user has businesses
  const { data: businesses } = await supabase
    .from("businesses")
    .select("id")
    .eq("user_id", user.id)
    .limit(1);

  if (!businesses || businesses.length === 0) {
    redirect("/onboarding");
  }

  const businessId = businesses[0].id;

  // Fetch stats
  const [reviewsResult, postsResult, scriptsResult, usageResult] =
    await Promise.all([
      supabase
        .from("reviews")
        .select("id", { count: "exact", head: true })
        .eq("business_id", businessId),
      supabase
        .from("social_posts")
        .select("id", { count: "exact", head: true })
        .eq("business_id", businessId),
      supabase
        .from("scripts")
        .select("id", { count: "exact", head: true })
        .eq("business_id", businessId),
      supabase
        .from("ai_usage")
        .select("credits_used")
        .eq("user_id", user.id)
        .gte(
          "created_at",
          new Date(
            new Date().getFullYear(),
            new Date().getMonth(),
            1
          ).toISOString()
        ),
    ]);

  const totalCreditsUsed =
    usageResult.data?.reduce((sum, r) => sum + r.credits_used, 0) ?? 0;

  const stats = [
    {
      title: "Total Reviews",
      value: reviewsResult.count ?? 0,
      icon: Star,
      color: "text-yellow-500",
    },
    {
      title: "Social Posts",
      value: postsResult.count ?? 0,
      icon: Share2,
      color: "text-blue-500",
    },
    {
      title: "Scripts Created",
      value: scriptsResult.count ?? 0,
      icon: Video,
      color: "text-purple-500",
    },
    {
      title: "AI Credits Used",
      value: totalCreditsUsed,
      icon: Sparkles,
      color: "text-primary",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back! Here&apos;s your business at a glance.
        </p>
      </div>
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
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
