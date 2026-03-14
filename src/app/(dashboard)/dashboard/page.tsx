"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
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

  // Activity
  const [activities, setActivities] = useState<ActivityItem[]>([]);

  // Greeting
  const hour = new Date().getHours();
  const greeting =
    hour < 12
      ? "좋은 아침이에요"
      : hour < 18
        ? "좋은 오후예요"
        : "좋은 저녁이에요";
  const todayFormatted = format(new Date(), "yyyy년 M월 d일 EEEE", {
    locale: ko,
  });

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
                ? `"${sop.title}" SOP가 생성되었습니다`
                : `"${sop.title}" SOP가 수정되었습니다`,
              time: formatDistanceToNow(new Date(sop.updated_at), {
                addSuffix: true,
                locale: ko,
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
      `이번 달 SOP ${totalSops}개를 보유하고 있습니다. ${draftSops > 0 ? `초안 상태인 SOP가 ${draftSops}개 있습니다.` : "모든 SOP가 게시되었습니다."}`
    );
  } else {
    insights.push(
      "아직 SOP가 없습니다. 첫 번째 SOP를 만들어 팀 운영을 시작해보세요."
    );
  }
  if (!unlimitedCredits) {
    const remaining = creditsLimit - creditsUsed;
    if (remaining > creditsLimit * 0.5) {
      insights.push(
        `AI 크레딧이 ${remaining}개 남아있습니다. 여유가 있으니 마음껏 활용하세요.`
      );
    } else if (remaining > 0) {
      insights.push(
        `AI 크레딧이 ${remaining}개 남아있습니다. 이번 달 사용량을 확인해보세요.`
      );
    } else {
      insights.push(
        "이번 달 AI 크레딧을 모두 사용했습니다. 플랜 업그레이드를 고려해보세요."
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
          className="text-2xl font-semibold tracking-tight"
          style={{ color: "var(--bb-text-primary)" }}
        >
          {greeting}, {userName}님
        </h2>
        <p
          className="text-sm"
          style={{ color: "var(--bb-text-secondary)" }}
        >
          {todayFormatted}
        </p>
      </div>

      {/* Stat Cards — mixed sizes */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {/* SOP Stats — wider card (col-span-2) */}
        <Card className="col-span-1 gap-4 rounded-md shadow-none md:col-span-2">
          <CardHeader className="flex flex-row items-center gap-2 pb-0">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-md"
              style={{ backgroundColor: "var(--bb-surface)" }}
            >
              <FileText className="h-4 w-4" style={{ color: "var(--bb-accent-blue)" }} />
            </div>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              SOP 현황
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-6">
              <div>
                <span className="font-mono text-3xl font-bold">{totalSops}</span>
                <span className="ml-1.5 text-xs text-muted-foreground">전체</span>
              </div>
              <div className="flex gap-4 text-sm">
                <div>
                  <span className="font-mono font-semibold">{publishedSops}</span>
                  <span className="ml-1 text-muted-foreground">게시됨</span>
                </div>
                <div>
                  <span className="font-mono font-semibold">{draftSops}</span>
                  <span className="ml-1 text-muted-foreground">초안</span>
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
              style={{ backgroundColor: "var(--bb-surface)" }}
            >
              <Users className="h-4 w-4" style={{ color: "var(--bb-accent-blue)" }} />
            </div>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              팀 현황
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <span className="font-mono text-3xl font-bold">{teamCount}</span>
              <span className="ml-1.5 text-xs text-muted-foreground">명</span>
            </div>
            {pendingInvites > 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                대기 중 {pendingInvites}명
              </p>
            )}
          </CardContent>
        </Card>

        {/* AI Credits */}
        <Card className="gap-4 rounded-md shadow-none">
          <CardHeader className="flex flex-row items-center gap-2 pb-0">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-md"
              style={{ backgroundColor: "var(--bb-surface)" }}
            >
              <Zap className="h-4 w-4" style={{ color: "var(--bb-accent-blue)" }} />
            </div>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              AI 크레딧
            </CardTitle>
          </CardHeader>
          <CardContent>
            {unlimitedCredits ? (
              <div>
                <span className="font-mono text-3xl font-bold">{creditsUsed}</span>
                <span className="ml-1.5 text-xs text-muted-foreground">사용됨</span>
                <p className="mt-1 text-xs text-muted-foreground">무제한</p>
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

      {/* AI Insights Card */}
      <Card className="rounded-md shadow-none" style={{ borderLeftColor: "var(--bb-warning)", borderLeftWidth: "3px" }}>
        <CardHeader className="flex flex-row items-center gap-2">
          <Lightbulb className="h-4 w-4" style={{ color: "var(--bb-warning)" }} />
          <CardTitle className="text-sm font-medium">AI 인사이트</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {insights.map((insight, i) => (
            <p
              key={i}
              className="text-sm leading-relaxed"
              style={{ color: "var(--bb-text-secondary)" }}
            >
              {insight}
            </p>
          ))}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card className="rounded-md shadow-none">
        <CardHeader>
          <CardTitle className="text-sm font-medium">최근 활동</CardTitle>
        </CardHeader>
        <CardContent>
          {activities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Clock
                className="mb-3 h-8 w-8"
                style={{ color: "var(--bb-text-tertiary, var(--muted-foreground))" }}
              />
              <p className="text-sm text-muted-foreground">
                아직 활동이 없습니다. 첫 SOP를 만들어보세요!
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
                        style={{ color: "var(--bb-success, #34D399)" }}
                      />
                    ) : (
                      <CheckCircle2
                        className="h-4 w-4"
                        style={{ color: "var(--bb-accent-blue)" }}
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{item.text}</p>
                  </div>
                  <span
                    className="flex-shrink-0 text-xs"
                    style={{ color: "var(--bb-text-secondary)" }}
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
          className="text-sm font-medium"
          style={{ color: "var(--bb-text-secondary)" }}
        >
          빠른 작업
        </h3>
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline" className="gap-2 rounded-md">
            <Link href="/dashboard/sops/new">
              <Plus className="h-4 w-4" />
              새 SOP 만들기
            </Link>
          </Button>
          <Button asChild variant="outline" className="gap-2 rounded-md">
            <Link href="/dashboard/settings">
              <UserPlus className="h-4 w-4" />
              팀원 초대
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
