"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { format, differenceInDays } from "date-fns";
import {
  FileText,
  Users,
  Zap,
  Plus,
  Clock,
  CheckCircle2,
  CheckSquare,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Loader2,
  Trash2,
  ListTodo,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useBusinessStore } from "@/hooks/use-business";
import { plans, type PlanId } from "@/config/plans";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface ChecklistRow {
  id: string;
  title: string;
  status: string;
  due_date: string | null;
  items: { text: string }[];
  assigned_to: string | null;
}

interface TodoRow {
  id: string;
  text: string;
  completed: boolean;
  completed_at: string | null;
  due_date: string | null;
  priority: string;
  created_at: string;
}

export default function DashboardPage() {
  const supabase = createClient();
  const { currentBusiness } = useBusinessStore();

  const [userName, setUserName] = useState("");
  const [loading, setLoading] = useState(true);

  const [overdueChecklists, setOverdueChecklists] = useState<ChecklistRow[]>([]);
  const [todayChecklists, setTodayChecklists] = useState<ChecklistRow[]>([]);
  const [overdueTodos, setOverdueTodos] = useState<TodoRow[]>([]);
  const [todayTodos, setTodayTodos] = useState<TodoRow[]>([]);
  const [todoText, setTodoText] = useState("");
  const [addingTodo, setAddingTodo] = useState(false);

  // Stats (collapsed)
  const [statsOpen, setStatsOpen] = useState(false);
  const [totalSops, setTotalSops] = useState(0);
  const [draftSops, setDraftSops] = useState(0);
  const [publishedSops, setPublishedSops] = useState(0);
  const [teamCount, setTeamCount] = useState(0);
  const [creditsUsed, setCreditsUsed] = useState(0);
  const [creditsLimit, setCreditsLimit] = useState(30);
  const [unlimitedCredits, setUnlimitedCredits] = useState(false);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const todayFormatted = format(new Date(), "EEEE, MMMM d, yyyy");
  const todayStr = format(new Date(), "yyyy-MM-dd");

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, plan_id")
          .eq("id", user.id)
          .single();

        setUserName(profile?.full_name || user.email?.split("@")[0] || "User");

        const planId = (profile?.plan_id as PlanId) ?? "free";
        const plan = plans[planId];
        const limit = plan.limits.aiCredits;
        if (limit === -1) setUnlimitedCredits(true);
        else setCreditsLimit(limit);

        // AI usage
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const { data: usage } = await supabase
          .from("ai_usage")
          .select("credits_used")
          .eq("user_id", user.id)
          .gte("created_at", startOfMonth.toISOString());
        setCreditsUsed(usage?.reduce((sum, r) => sum + r.credits_used, 0) ?? 0);

        const businessId = currentBusiness?.id;
        if (!businessId) return;

        // Checklists
        const { data: allChecklists } = await supabase
          .from("checklists")
          .select("id, title, status, due_date, items, assigned_to")
          .eq("business_id", businessId)
          .neq("status", "completed")
          .order("due_date");

        if (allChecklists) {
          const overdue: ChecklistRow[] = [];
          const today: ChecklistRow[] = [];

          for (const cl of allChecklists) {
            if (!cl.due_date) { today.push(cl); continue; }
            if (cl.due_date === todayStr) today.push(cl);
            else if (cl.due_date < todayStr) overdue.push(cl);
          }

          setOverdueChecklists(overdue);
          setTodayChecklists(today);
        }

        // Auto-generate recurring checklist instances
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const { data: recurringTemplates } = await supabase
          .from("checklists")
          .select("*")
          .eq("business_id", businessId)
          .eq("is_template", true)
          .neq("recurrence_type", "none");

        if (recurringTemplates) {
          for (const tmpl of recurringTemplates) {
            const lastGen = tmpl.last_generated_at ? new Date(tmpl.last_generated_at) : null;
            let shouldGenerate = false;

            if (!lastGen) {
              shouldGenerate = true;
            } else if (tmpl.recurrence_type === "daily" && lastGen < startOfDay) {
              shouldGenerate = true;
            } else if (tmpl.recurrence_type === "weekly") {
              const daysSince = differenceInDays(new Date(), lastGen);
              if (daysSince >= 7) shouldGenerate = true;
            } else if (tmpl.recurrence_type === "monthly") {
              const daysSince = differenceInDays(new Date(), lastGen);
              if (daysSince >= 28) shouldGenerate = true;
            }

            if (shouldGenerate) {
              await supabase.from("checklists").insert({
                business_id: businessId,
                sop_id: tmpl.sop_id,
                title: tmpl.title,
                items: tmpl.items,
                status: "pending",
                due_date: todayStr,
                created_by: tmpl.created_by,
              });
              await supabase
                .from("checklists")
                .update({ last_generated_at: new Date().toISOString() })
                .eq("id", tmpl.id);
            }
          }
        }

        // Todos — active only
        const { data: todoData } = await supabase
          .from("todos")
          .select("id, text, completed, completed_at, due_date, priority, created_at")
          .eq("user_id", user.id)
          .eq("completed", false)
          .order("sort_order")
          .limit(30);

        if (todoData) {
          setOverdueTodos(todoData.filter((t) => t.due_date && t.due_date < todayStr));
          setTodayTodos(todoData.filter((t) => !t.due_date || t.due_date >= todayStr));
        }

        // SOPs for stats
        const { data: sops } = await supabase
          .from("sops")
          .select("id, status")
          .eq("business_id", businessId)
          .is("deleted_at", null);

        if (sops) {
          setTotalSops(sops.length);
          setDraftSops(sops.filter((s) => s.status === "draft").length);
          setPublishedSops(sops.filter((s) => s.status === "published").length);
        }

        // Team count
        const { data: members } = await supabase
          .from("profiles")
          .select("id")
          .eq("business_id", businessId);
        setTeamCount(members?.length ?? 1);
      } catch {
        // Dashboard will show zeros
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, [supabase, currentBusiness?.id]);

  async function handleAddTodo() {
    if (!todoText.trim() || !currentBusiness?.id) return;
    setAddingTodo(true);
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("todos")
      .insert({
        business_id: currentBusiness.id,
        user_id: user?.id,
        text: todoText.trim(),
        due_date: todayStr,
        priority: "normal",
        sort_order: todayTodos.length,
      })
      .select("id, text, completed, completed_at, due_date, priority, created_at")
      .single();

    if (error) toast.error(error.message);
    else if (data) {
      setTodayTodos((prev) => [...prev, data]);
      setTodoText("");
    }
    setAddingTodo(false);
  }

  async function handleToggleTodo(todoId: string) {
    const now = new Date().toISOString();
    await supabase
      .from("todos")
      .update({ completed: true, completed_at: now })
      .eq("id", todoId);

    setTodayTodos((prev) => prev.filter((t) => t.id !== todoId));
    setOverdueTodos((prev) => prev.filter((t) => t.id !== todoId));
    toast.success("Todo completed");
  }

  async function handleDeleteTodo(todoId: string) {
    await supabase.from("todos").delete().eq("id", todoId);
    setTodayTodos((prev) => prev.filter((t) => t.id !== todoId));
    setOverdueTodos((prev) => prev.filter((t) => t.id !== todoId));
  }

  // Summary line
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
      {/* Greeting */}
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          {greeting}, {userName}
        </h2>
        <p className="text-sm text-muted-foreground">{todayFormatted}</p>
        {summaryParts.length > 0 && (
          <p className="text-xs text-muted-foreground">{summaryParts.join(" \u00b7 ")}</p>
        )}
      </div>

      {/* SECTION 1: Overdue — only if items exist */}
      {(overdueChecklists.length > 0 || overdueTodos.length > 0) && (
        <Card className="rounded-md border-l-[3px] border-l-destructive shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Overdue ({totalOverdue})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {overdueChecklists.map((cl) => {
              const daysOverdue = cl.due_date ? differenceInDays(new Date(), new Date(cl.due_date)) : 0;
              return (
                <Link key={cl.id} href={`/dashboard/checklists/${cl.id}`} className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-muted/50 transition-colors">
                  <CheckSquare className="h-4 w-4 shrink-0 text-destructive" />
                  <span className="flex-1 text-sm">{cl.title}</span>
                  <span className="text-xs text-destructive">
                    overdue {daysOverdue} day{daysOverdue !== 1 ? "s" : ""}
                  </span>
                </Link>
              );
            })}
            {overdueTodos.map((todo) => {
              const daysOverdue = todo.due_date ? differenceInDays(new Date(), new Date(todo.due_date)) : 0;
              return (
                <div key={todo.id} className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-muted/50">
                  <button
                    type="button"
                    onClick={() => handleToggleTodo(todo.id)}
                    className="flex h-4 w-4 shrink-0 items-center justify-center rounded border border-destructive/40 hover:border-primary hover:bg-primary/10 transition-colors"
                  />
                  <span className="flex-1 text-sm">{todo.text}</span>
                  <span className="text-xs text-destructive">
                    overdue {daysOverdue} day{daysOverdue !== 1 ? "s" : ""}
                  </span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* SECTION 2: Today's Checklists */}
      <Card className="rounded-md border-l-[3px] border-l-primary shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <CheckSquare className="h-4 w-4 text-primary" />
            Today&apos;s Checklists ({todayChecklists.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {todayChecklists.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No checklists scheduled for today
            </p>
          ) : (
            <div className="space-y-1">
              {todayChecklists.map((cl) => {
                const itemCount = cl.items?.length ?? 0;
                const isInProgress = cl.status === "in_progress";
                return (
                  <Link key={cl.id} href={`/dashboard/checklists/${cl.id}`} className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-muted/50 transition-colors">
                    {cl.status === "completed" ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                    ) : isInProgress ? (
                      <Clock className="h-4 w-4 shrink-0 text-primary" />
                    ) : (
                      <CheckSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <span className="flex-1 text-sm">{cl.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {itemCount} items · {cl.status === "pending" ? "not started" : cl.status.replace("_", " ")}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* SECTION 3: Today's Todos */}
      <Card className="rounded-md border-l-[3px] border-l-emerald-400 shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <ListTodo className="h-4 w-4 text-emerald-400" />
            Today&apos;s Todos ({todayTodos.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {/* Inline add */}
          <form onSubmit={(e) => { e.preventDefault(); handleAddTodo(); }} className="flex items-center gap-2">
            <Input
              value={todoText}
              onChange={(e) => setTodoText(e.target.value)}
              placeholder="Add a todo..."
              className="h-8 text-sm"
            />
            {addingTodo && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </form>

          {todayTodos.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">No todos for today. Type above and press Enter.</p>
          ) : (
            <div className="space-y-1">
              {todayTodos.map((todo) => (
                <div key={todo.id} className="group flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted/50">
                  <button
                    type="button"
                    onClick={() => handleToggleTodo(todo.id)}
                    className="flex h-4 w-4 shrink-0 items-center justify-center rounded border border-muted-foreground/30 hover:border-emerald-400 hover:bg-emerald-400/10 transition-colors"
                  />
                  <span className="flex-1 text-sm">{todo.text}</span>
                  <button type="button" className="shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteTodo(todo.id)}>
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* SECTION 4: Statistics (collapsed by default) */}
      <Card className="rounded-md shadow-none">
        <button
          type="button"
          className="flex w-full items-center justify-between px-6 py-4 text-left"
          onClick={() => setStatsOpen(!statsOpen)}
        >
          <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            Statistics
          </span>
          {statsOpen ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
        {statsOpen && (
          <CardContent className="pt-0">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-md border p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                  <FileText className="h-3.5 w-3.5 text-primary" />
                  SOP Overview
                </div>
                <div className="flex items-baseline gap-4">
                  <span className="font-mono text-2xl font-bold">{totalSops}</span>
                  <span className="text-xs text-muted-foreground">{publishedSops} published \u00b7 {draftSops} drafts</span>
                </div>
              </div>

              <div className="rounded-md border p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                  <Users className="h-3.5 w-3.5 text-primary" />
                  Team
                </div>
                <span className="font-mono text-2xl font-bold">{teamCount}</span>
                <span className="ml-2 text-xs text-muted-foreground">members</span>
              </div>

              <div className="rounded-md border p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                  <Zap className="h-3.5 w-3.5 text-primary" />
                  AI Generations
                </div>
                <span className="font-mono text-2xl font-bold">{creditsUsed}</span>
                {!unlimitedCredits && (
                  <span className="ml-1 text-xs text-muted-foreground">/ {creditsLimit}</span>
                )}
                <span className="ml-2 text-xs text-muted-foreground">this month</span>
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
