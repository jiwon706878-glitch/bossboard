"use client";

import { format } from "date-fns";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { useDashboard } from "@/hooks/use-dashboard";
import { OverdueSection } from "@/components/dashboard/overdue-section";
import { TodayChecklists } from "@/components/dashboard/today-checklists";
import { TodayTodos } from "@/components/dashboard/today-todos";
import { StatsSection } from "@/components/dashboard/stats-section";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const {
    userName, loading,
    overdueChecklists, todayChecklists, overdueTodos, todayTodos,
    todoText, setTodoText, addingTodo,
    totalSops, draftSops, publishedSops, teamCount,
    creditsUsed, creditsLimit, unlimitedCredits,
    handleAddTodo, handleToggleTodo, handleDeleteTodo,
  } = useDashboard();

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const todayFormatted = format(new Date(), "EEEE, MMMM d, yyyy");

  const totalOverdue = overdueChecklists.length + overdueTodos.length;
  const summaryParts: string[] = [];
  if (totalOverdue > 0) summaryParts.push(`${totalOverdue} overdue`);
  if (todayChecklists.length > 0) summaryParts.push(`${todayChecklists.length} checklist${todayChecklists.length > 1 ? "s" : ""} today`);
  if (todayTodos.length > 0) summaryParts.push(`${todayTodos.length} todo${todayTodos.length > 1 ? "s" : ""}`);

  if (loading) {
    return (
      <div className="mx-auto max-w-[1080px] space-y-6">
        <div className="space-y-2">
          <div className="h-7 w-64 animate-pulse rounded-md bg-muted" />
          <div className="h-5 w-48 animate-pulse rounded-md bg-muted" />
        </div>
        <div className="h-32 animate-pulse rounded-md border bg-card" />
        <div className="h-48 animate-pulse rounded-md border bg-card" />
        <div className="h-32 animate-pulse rounded-md border bg-card" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1080px] space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          {greeting}, {userName}
        </h2>
        <p className="text-sm text-muted-foreground">{todayFormatted}</p>
        {summaryParts.length > 0 && (
          <p className="text-xs text-muted-foreground">{summaryParts.join(" \u00b7 ")}</p>
        )}
      </div>

      {overdueChecklists.length === 0 && todayChecklists.length === 0 && overdueTodos.length === 0 && todayTodos.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-md border bg-card py-16 text-center">
          <Sparkles className="mb-3 h-10 w-10 text-muted-foreground/50" />
          <h3 className="text-lg font-medium text-foreground">Welcome to BossBoard</h3>
          <p className="mt-1 text-sm text-muted-foreground">Start by creating your first SOP in the Wiki.</p>
          <Button asChild variant="outline" size="sm" className="mt-4">
            <Link href="/dashboard/sops">Go to Wiki &rarr;</Link>
          </Button>
        </div>
      )}
      <OverdueSection overdueChecklists={overdueChecklists} overdueTodos={overdueTodos} onToggleTodo={handleToggleTodo} onDeleteTodo={handleDeleteTodo} />
      <TodayChecklists checklists={todayChecklists} />
      <TodayTodos todos={todayTodos} todoText={todoText} setTodoText={setTodoText} addingTodo={addingTodo} onAddTodo={handleAddTodo} onToggleTodo={handleToggleTodo} onDeleteTodo={handleDeleteTodo} />
      <StatsSection totalSops={totalSops} publishedSops={publishedSops} draftSops={draftSops} teamCount={teamCount} creditsUsed={creditsUsed} creditsLimit={creditsLimit} unlimitedCredits={unlimitedCredits} />
    </div>
  );
}
