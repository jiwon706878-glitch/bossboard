"use client";

import { BookOpen, ListTodo, Users, Zap, TrendingUp } from "lucide-react";

interface StatsSectionProps {
  totalSops: number;
  publishedSops: number;
  draftSops: number;
  teamCount: number;
  creditsUsed: number;
  creditsLimit: number;
  unlimitedCredits: boolean;
  activeTodos?: number;
}

interface StatCardProps {
  label: string;
  value: number | string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
  hintColor?: "success" | "warning" | "secondary";
  hintIcon?: React.ComponentType<{ className?: string }>;
}

function StatCard({ label, value, hint, icon: Icon, hintColor = "secondary", hintIcon: HintIcon }: StatCardProps) {
  const hintColorClass =
    hintColor === "success"
      ? "text-success"
      : hintColor === "warning"
      ? "text-warning"
      : "text-text-secondary";

  return (
    <div className="rounded-lg border border-border bg-surface-elevated p-6 transition-colors hover:border-text-tertiary">
      <div className="flex items-start justify-between">
        <span className="text-sm text-text-secondary">{label}</span>
        <Icon className="h-5 w-5 text-text-tertiary" />
      </div>
      <div className="mt-4 text-3xl font-bold text-text-primary tracking-tight">
        {value}
      </div>
      <div className={`mt-2 flex items-center gap-1 text-xs ${hintColorClass}`}>
        {HintIcon && <HintIcon className="h-3.5 w-3.5" />}
        <span>{hint}</span>
      </div>
    </div>
  );
}

export function StatsSection({
  totalSops,
  publishedSops,
  draftSops,
  teamCount,
  creditsUsed,
  creditsLimit,
  unlimitedCredits,
  activeTodos = 0,
}: StatsSectionProps) {
  const creditsRemaining = unlimitedCredits ? "∞" : Math.max(0, creditsLimit - creditsUsed).toLocaleString();

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 stagger-children">
      <StatCard
        label="Wiki Pages"
        value={totalSops}
        hint={`${publishedSops} published · ${draftSops} drafts`}
        icon={BookOpen}
      />
      <StatCard
        label="Active Todos"
        value={activeTodos}
        hint={activeTodos > 0 ? "Tasks open" : "All caught up"}
        icon={ListTodo}
        hintColor={activeTodos > 0 ? "secondary" : "success"}
      />
      <StatCard
        label="Team Members"
        value={teamCount}
        hint={teamCount === 1 ? "Just you" : `${teamCount} members`}
        icon={Users}
      />
      <StatCard
        label="Credits Left"
        value={creditsRemaining}
        hint={unlimitedCredits ? "Unlimited" : `${creditsUsed.toLocaleString()} used this month`}
        icon={Zap}
        hintColor={
          unlimitedCredits
            ? "success"
            : creditsUsed / creditsLimit > 0.8
            ? "warning"
            : "secondary"
        }
        hintIcon={!unlimitedCredits && creditsUsed / creditsLimit < 0.5 ? TrendingUp : undefined}
      />
    </div>
  );
}
