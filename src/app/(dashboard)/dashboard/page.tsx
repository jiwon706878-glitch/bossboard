"use client";

import { useEffect, useState } from "react";
import { useDashboard } from "@/hooks/use-dashboard";
import { useRoleStore } from "@/hooks/use-role";
import { OverdueSection } from "@/components/dashboard/overdue-section";
import { TodayChecklists } from "@/components/dashboard/today-checklists";
import { TodayTodos } from "@/components/dashboard/today-todos";
import { StatsSection } from "@/components/dashboard/stats-section";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { SearchDropdown } from "@/components/dashboard/search-dropdown";

export default function DashboardPage() {
  const { isAdmin, loadRole } = useRoleStore();
  useEffect(() => { loadRole(); }, [loadRole]);

  const [searchOpen, setSearchOpen] = useState(false);

  const {
    userName, loading, todosLoading,
    overdueChecklists, todayChecklists, overdueTodos, todayTodos,
    activeTodos,
    todoText, setTodoText, addingTodo,
    totalSops, draftSops, publishedSops, teamCount,
    handleAddTodo, handleToggleTodo, handleDeleteTodo,
  } = useDashboard();

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  if (loading) {
    return (
      <div className="mx-auto max-w-[1200px] space-y-6">
        <div className="space-y-2">
          <div className="h-8 w-48 animate-pulse rounded-md bg-surface" />
          <div className="h-5 w-64 animate-pulse rounded-md bg-surface" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-lg border border-border bg-surface-elevated" />
          ))}
        </div>
        <div className="h-96 animate-pulse rounded-lg border border-border bg-surface-elevated" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1200px] space-y-6">
      {/* ── Header: greeting + quick actions ───────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-text-primary">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            {greeting}, {userName}
          </p>
        </div>
        <QuickActions onSearch={() => setSearchOpen(true)} />
      </div>

      {/* ── Stat cards (3 after Day 5: wiki, todos, team) ─── */}
      {isAdmin() && (
        <StatsSection
          totalSops={totalSops}
          publishedSops={publishedSops}
          draftSops={draftSops}
          teamCount={teamCount}
          activeTodos={activeTodos}
        />
      )}

      {/* ── Recent activity feed ──────────────────────────── */}
      <RecentActivity />

      {/* ── Action sections (existing components) ─────────── */}
      <OverdueSection
        overdueChecklists={overdueChecklists}
        overdueTodos={overdueTodos}
        onToggleTodo={handleToggleTodo}
        onDeleteTodo={handleDeleteTodo}
      />
      <TodayChecklists checklists={todayChecklists} />
      <TodayTodos
        todos={todayTodos}
        todoText={todoText}
        setTodoText={setTodoText}
        addingTodo={addingTodo}
        onAddTodo={handleAddTodo}
        onToggleTodo={handleToggleTodo}
        onDeleteTodo={handleDeleteTodo}
        loading={todosLoading}
      />

      <SearchDropdown open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}
