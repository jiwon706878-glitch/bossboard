"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import {
  FileText,
  Users,
  Zap,
  Lightbulb,
  Plus,
  UserPlus,
  Clock,
  CheckCircle2,
  FilePlus2,
  Sparkles,
  CheckSquare,
  AlertTriangle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useBusinessStore } from "@/hooks/use-business";
import { plans, type PlanId } from "@/config/plans";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface SopRow {
  id: string;
  title: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface ActivityItem {
  id: string;
  text: string;
  time: string;
  icon: "created" | "updated";
}

export default function DashboardPage() {
  const supabase = createClient();
  const { currentBusiness } = useBusinessStore();

  const [userName, setUserName] = useState("");
  const [loading, setLoading] = useState(true);

  // Stats
  const [totalSops, setTotalSops] = useState(0);
  const [draftSops, setDraftSops] = useState(0);
  const [publishedSops, setPublishedSops] = useState(0);
  const [teamCount, setTeamCount] = useState(0);
  const [pendingInvites, setPendingInvites] = useState(0);
  const [creditsUsed, setCreditsUsed] = useState(0);
  const [creditsLimit, setCreditsLimit] = useState(30);
  const [unlimitedCredits, setUnlimitedCredits] = useState(false);
  const [checklistsDueToday, setChecklistsDueToday] = useState(0);
  const [checklistsOverdue, setChecklistsOverdue] = useState(0);
  const [unreadSops, setUnreadSops] = useState(0);

  // Activity
  const [activities, setActivities] = useState<ActivityItem[]>([]);

  // Greeting
  const hour = new Date().getHours();
  const greeting =
    hour < 12
      ? "Good morning"
      : hour < 18
        ? "Good afternoon"
        : "Good evening";
  const todayFormatted = format(new Date(), "EEEE, MMMM d, yyyy");

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        // Get profile for name and plan
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, plan_id")
          .eq("id", user.id)
          .single();

        const name =
          profile?.full_name || user.email?.split("@")[0] || "User";
        setUserName(name);

        const planId = (profile?.plan_id as PlanId) ?? "free";
        const plan = plans[planId];
        const limit = plan.limits.aiCredits;
        if (limit === -1) {
          setUnlimitedCredits(true);
        } else {
          setCreditsLimit(limit);
        }

        // Get monthly AI usage
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const { data: usage } = await supabase
          .from("ai_usage")
          .select("credits_used")
          .eq("user_id", user.id)
          .gte("created_at", startOfMonth.toISOString());

        const totalUsed =
          usage?.reduce((sum, row) => sum + row.credits_used, 0) ?? 0;
        setCreditsUsed(totalUsed);

        const businessId = currentBusiness?.id;
        if (!businessId) return;

        // Fetch SOPs
        const { data: sops } = await supabase
          .from("sops")
          .select("id, title, status, created_at, updated_at")
          .eq("business_id", businessId)
          .order("updated_at", { ascending: false });

        if (sops) {
          setTotalSops(sops.length);
          setDraftSops(sops.filter((s) => s.status === "draft").length);
          setPublishedSops(sops.filter((s) => s.status === "published").length);

          // Build activity feed from recent SOPs
          const recentSops = sops.slice(0, 5);
          const activityItems: ActivityItem[] = recentSops.map((sop) => {
            const isNew =
              new Date(sop.created_at).getTime() ===
              new Date(sop.updated_at).getTime();
            return {
              id: sop.id,
              text: isNew
                ? `Created SOP: "${sop.title}"`
                : `Updated SOP: "${sop.title}"`,
              time: formatDistanceToNow(new Date(sop.updated_at), {
                addSuffix: true,
              }),
              icon: isNew ? "created" : "updated",
            };
          });
          setActivities(activityItems);
        }

        // Fetch team count (profiles linked to same business)
        // Note: team data may not be available in all setups
        const { data: invites } = await supabase
          .from("invites")
          .select("id, accepted")
          .eq("business_id", businessId);

        if (invites) {
          const accepted = invites.filter((i) => i.accepted).length;
          const pending = invites.filter((i) => !i.accepted).length;
          setTeamCount(accepted + 1); // +1 for owner
          setPendingInvites(pending);
        } else {
          setTeamCount(1);
        }

        // Fetch active checklists for due today / overdue counts
        const { data: activeChecklists } = await supabase
          .from("checklists")
          .select("id, due_date, status")
          .eq("business_id", businessId)
          .neq("status", "completed");

        if (activeChecklists) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const todayStr = today.toISOString().split("T")[0];

          let dueToday = 0;
          let overdue = 0;
          for (const cl of activeChecklists) {
            if (!cl.due_date) continue;
            if (cl.due_date === todayStr) dueToday++;
            else if (cl.due_date < todayStr) overdue++;
          }
          setChecklistsDueToday(dueToday);
          setChecklistsOverdue(overdue);
        }

        // Count unread SOPs for current user
        if (sops && sops.length > 0) {
          const sopIds = sops.map((s) => s.id);
          const { data: myReads } = await supabase
            .from("sop_reads")
            .select("sop_id")
            .eq("user_id", user.id)
            .in("sop_id", sopIds);

          const readIds = new Set((myReads ?? []).map((r) => r.sop_id));
          setUnreadSops(sopIds.filter((id) => !readIds.has(id)).length);
        }
      } catch {
        // Silently handle errors — dashboard will show zeros
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, [supabase, currentBusiness?.id]);

  const creditsPercent = unlimitedCredits
    ? 0
    : Math.min(100, Math.round((creditsUsed / creditsLimit) * 100));

  // Generate insight text based on data
  const insights: string[] = [];
  if (totalSops > 0) {
    insights.push(
      `You have ${totalSops} SOPs. ${draftSops > 0 ? `${draftSops} are still in draft.` : 'All SOPs are published.'}`
    );
  } else {
    insights.push(
      "No SOPs yet. Create your first SOP to start organizing your team's operations."
    );
  }
  if (!unlimitedCredits) {
    const remaining = creditsLimit - creditsUsed;
    if (remaining > creditsLimit * 0.5) {
      insights.push(
        `You have ${remaining} AI credits remaining. Plenty of room to keep generating.`
      );
    } else if (remaining > 0) {
      insights.push(
        `You have ${remaining} AI credits remaining. Keep an eye on your usage this month.`
      );
    } else {
      insights.push(
        "You've used all your AI credits this month. Consider upgrading your plan."
      );
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-[1080px] space-y-8">
        {/* Skeleton greeting */}
        <div className="space-y-2">
          <div className="h-7 w-64 animate-pulse rounded-md bg-muted" />
          <div className="h-5 w-48 animate-pulse rounded-md bg-muted" />
        </div>
        {/* Skeleton stat cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="col-span-2 h-32 animate-pulse rounded-md border bg-card" />
          <div className="h-32 animate-pulse rounded-md border bg-card" />
          <div className="h-32 animate-pulse rounded-md border bg-card" />
        </div>
        {/* Skeleton insights */}
        <div className="h-28 animate-pulse rounded-md border bg-card" />
        {/* Skeleton activity */}
        <div className="h-48 animate-pulse rounded-md border bg-card" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1080px] space-y-8">
      {/* Greeting Section */}
      <div className="space-y-1">
        <h2
          className="text-2xl font-semibold tracking-tight text-foreground"
        >
          {greeting}, {userName}
        </h2>
        <p
          className="text-sm text-muted-foreground"
        >
          {todayFormatted}
        </p>
      </div>

      {/* Welcome Banner — shown only when user has no SOPs */}
      {totalSops === 0 && (
        <div
          className="rounded-md p-6"
          style={{
            backgroundColor: "#141824",
            border: "1px solid #2A3050",
            borderLeft: "3px solid #4F8BFF",
          }}
        >
          <h3 className="text-lg font-semibold text-foreground">
            Welcome to BossBoard!
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Create your first AI-generated SOP in 30 seconds. Just describe a topic
            and the AI handles the rest.
          </p>
          <Button asChild className="mt-4 gap-2">
            <Link href="/dashboard/sops/new">
              <Sparkles className="h-4 w-4" />
              Create Your First SOP
            </Link>
          </Button>
        </div>
      )}

      {/* Stat Cards — mixed sizes */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {/* SOP Stats — wider card (col-span-2) */}
        <Card className="col-span-1 gap-4 rounded-md shadow-none md:col-span-2">
          <CardHeader className="flex flex-row items-center gap-2 pb-0">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-md"
              style={{ backgroundColor: "#232840" }}
            >
              <FileText className="h-4 w-4" style={{ color: "#4F8BFF" }} />
            </div>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              SOP Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-6">
              <div>
                <span className="font-mono text-3xl font-bold">{totalSops}</span>
                <span className="ml-1.5 text-xs text-muted-foreground">total</span>
              </div>
              <div className="flex gap-4 text-sm">
                <div>
                  <span className="font-mono font-semibold">{publishedSops}</span>
                  <span className="ml-1 text-muted-foreground">published</span>
                </div>
                <div>
                  <span className="font-mono font-semibold">{draftSops}</span>
                  <span className="ml-1 text-muted-foreground">drafts</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Team Stats */}
        <Card className="gap-4 rounded-md shadow-none">
          <CardHeader className="flex flex-row items-center gap-2 pb-0">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-md"
              style={{ backgroundColor: "#232840" }}
            >
              <Users className="h-4 w-4" style={{ color: "#4F8BFF" }} />
            </div>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Team
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <span className="font-mono text-3xl font-bold">{teamCount}</span>
              <span className="ml-1.5 text-xs text-muted-foreground">members</span>
            </div>
            {pendingInvites > 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                {pendingInvites} pending
              </p>
            )}
          </CardContent>
        </Card>

        {/* AI Credits */}
        <Card className="gap-4 rounded-md shadow-none">
          <CardHeader className="flex flex-row items-center gap-2 pb-0">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-md"
              style={{ backgroundColor: "#232840" }}
            >
              <Zap className="h-4 w-4" style={{ color: "#4F8BFF" }} />
            </div>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              AI Generations
            </CardTitle>
          </CardHeader>
          <CardContent>
            {unlimitedCredits ? (
              <div>
                <span className="font-mono text-3xl font-bold">{creditsUsed}</span>
                <span className="ml-1.5 text-xs text-muted-foreground">used</span>
                <p className="mt-1 text-xs text-muted-foreground">Unlimited</p>
              </div>
            ) : (
              <div>
                <div>
                  <span className="font-mono text-3xl font-bold">{creditsUsed}</span>
                  <span className="ml-1 text-xs text-muted-foreground">
                    / {creditsLimit}
                  </span>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      creditsPercent >= 90
                        ? "bg-red-400"
                        : creditsPercent >= 70
                          ? "bg-amber-400"
                          : "bg-emerald-400"
                    )}
                    style={{ width: `${creditsPercent}%` }}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Alerts: Checklists & Unread SOPs */}
      {(checklistsDueToday > 0 || checklistsOverdue > 0 || unreadSops > 0) && (
        <div className="flex flex-wrap gap-3">
          {unreadSops > 0 && (
            <Link href="/dashboard/sops">
              <div
                className="flex items-center gap-2 rounded-md px-4 py-2.5 text-sm transition-colors duration-150 hover:opacity-90"
                style={{
                  backgroundColor: "#232840",
                  border: "1px solid #2A3050",
                  borderLeftWidth: "3px",
                  borderLeftColor: "#FBBF24",
                }}
              >
                <FileText className="h-4 w-4" style={{ color: "#FBBF24" }} />
                <span className="font-mono font-semibold">{unreadSops}</span>
                <span className="text-muted-foreground">
                  {unreadSops === 1 ? "SOP needs" : "SOPs need"} your review
                </span>
              </div>
            </Link>
          )}
          {checklistsDueToday > 0 && (
            <Link href="/dashboard/checklists">
              <div
                className="flex items-center gap-2 rounded-md px-4 py-2.5 text-sm transition-colors duration-150 hover:opacity-90"
                style={{
                  backgroundColor: "#232840",
                  border: "1px solid #2A3050",
                  borderLeftWidth: "3px",
                  borderLeftColor: "#4F8BFF",
                }}
              >
                <CheckSquare className="h-4 w-4" style={{ color: "#4F8BFF" }} />
                <span className="font-mono font-semibold">{checklistsDueToday}</span>
                <span className="text-muted-foreground">
                  {checklistsDueToday === 1 ? "checklist" : "checklists"} due today
                </span>
              </div>
            </Link>
          )}
          {checklistsOverdue > 0 && (
            <Link href="/dashboard/checklists">
              <div
                className="flex items-center gap-2 rounded-md px-4 py-2.5 text-sm transition-colors duration-150 hover:opacity-90"
                style={{
                  backgroundColor: "#232840",
                  border: "1px solid #2A3050",
                  borderLeftWidth: "3px",
                  borderLeftColor: "#F87171",
                }}
              >
                <AlertTriangle className="h-4 w-4" style={{ color: "#F87171" }} />
                <span className="font-mono font-semibold">{checklistsOverdue}</span>
                <span className="text-muted-foreground">overdue</span>
              </div>
            </Link>
          )}
        </div>
      )}

      {/* AI Insights Card */}
      <Card className="rounded-md shadow-none" style={{ borderLeftColor: "#FBBF24", borderLeftWidth: "3px" }}>
        <CardHeader className="flex flex-row items-center gap-2">
          <Lightbulb className="h-4 w-4" style={{ color: "#FBBF24" }} />
          <CardTitle className="text-sm font-medium">AI Insights</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {insights.map((insight, i) => (
            <p
              key={i}
              className="text-sm leading-relaxed text-muted-foreground"
            >
              {insight}
            </p>
          ))}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card className="rounded-md shadow-none">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {activities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Clock
                className="mb-3 h-8 w-8 text-muted-foreground"
              />
              <p className="text-sm text-muted-foreground">
                No activity yet. Create your first SOP to get started!
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {activities.map((item) => (
                <li key={item.id} className="flex items-start gap-3">
                  <div className="mt-0.5 flex-shrink-0">
                    {item.icon === "created" ? (
                      <FilePlus2
                        className="h-4 w-4"
                        style={{ color: "#34D399" }}
                      />
                    ) : (
                      <CheckCircle2
                        className="h-4 w-4"
                        style={{ color: "#4F8BFF" }}
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{item.text}</p>
                  </div>
                  <span
                    className="flex-shrink-0 text-xs text-muted-foreground"
                  >
                    {item.time}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="space-y-3">
        <h3
          className="text-sm font-medium text-muted-foreground"
        >
          Quick Actions
        </h3>
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline" className="gap-2 rounded-md">
            <Link href="/dashboard/sops/new">
              <Plus className="h-4 w-4" />
              New SOP
            </Link>
          </Button>
          <Button asChild variant="outline" className="gap-2 rounded-md">
            <Link href="/dashboard/settings">
              <UserPlus className="h-4 w-4" />
              Invite Team
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
