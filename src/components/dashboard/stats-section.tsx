"use client";

import { BookOpen, ListTodo, Users } from "lucide-react";

interface StatsSectionProps {
  totalSops: number;
  publishedSops: number;
  draftSops: number;
  teamCount: number;
  activeTodos?: number;
}

interface StatCardProps {
  label: string;
  value: number | string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
  hintColor?: "success" | "warning" | "secondary";
}

function StatCard({ label, value, hint, icon: Icon, hintColor = "secondary" }: StatCardProps) {
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
        <span>{hint}</span>
      </div>
    </div>
  );
}

/**
 * Dashboard stats row. Day 5 dropped the "Credits Left" card — credits
 * no longer exist; BYOK drives AI features on paid plans. Kept the
 * grid as 3 cards (Wiki / Todos / Team).
 */
export function StatsSection({
  totalSops,
  publishedSops,
  draftSops,
  teamCount,
  activeTodos = 0,
}: StatsSectionProps) {
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-3 stagger-children">
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
    </div>
  );
}
