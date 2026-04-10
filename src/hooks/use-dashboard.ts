"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, differenceInDays } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { useBusinessStore } from "@/hooks/use-business";
import { plans, type PlanId } from "@/config/plans";
import {
  fetchCurrentUser,
  fetchProfile,
  fetchMonthlyUsage,
  userKeys,
  todoKeys,
  usageKeys,
} from "@/lib/queries";
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

export type { ChecklistRow, TodoRow };

const supabase = createClient();

function getTodayStr() {
  return format(new Date(), "yyyy-MM-dd");
}

// ─── Fetch functions (dashboard-specific) ─────────

async function fetchDashboardChecklists(businessId: string) {
  const { data, error } = await supabase
    .from("checklists")
    .select("id, title, status, due_date, items, assigned_to")
    .eq("business_id", businessId)
    .neq("status", "completed")
    .order("due_date");
  if (error) throw error;
  return data ?? [];
}

async function fetchDashboardTodos(userId: string) {
  const { data, error } = await supabase
    .from("todos")
    .select("id, text, completed, completed_at, due_date, priority, created_at")
    .eq("user_id", userId)
    .eq("completed", false)
    .order("sort_order")
    .limit(30);
  if (error) throw error;
  return data ?? [];
}

async function fetchDashboardSopStats(businessId: string) {
  const { data, error } = await supabase
    .from("sops")
    .select("id, status, updated_at")
    .eq("business_id", businessId)
    .is("deleted_at", null);
  if (error) throw error;
  const sops = data ?? [];
  const staleThreshold = Date.now() - 90 * 24 * 60 * 60 * 1000;
  return {
    total: sops.length,
    draft: sops.filter((s: any) => s.status === "draft").length,
    published: sops.filter((s: any) => s.status === "published").length,
    stale: sops.filter((s: any) => s.updated_at && new Date(s.updated_at).getTime() < staleThreshold).length,
  };
}

async function generateRecurringChecklists(businessId: string) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const { data: templates } = await supabase
    .from("checklists")
    .select("id, sop_id, title, items, recurrence_type, recurrence_days, last_generated_at, created_by")
    .eq("business_id", businessId)
    .eq("is_template", true)
    .neq("recurrence_type", "none");

  if (!templates) return;
  for (const tmpl of templates) {
    const lastGen = tmpl.last_generated_at ? new Date(tmpl.last_generated_at) : null;
    let shouldGenerate = false;
    if (!lastGen) shouldGenerate = true;
    else if (tmpl.recurrence_type === "daily" && lastGen < startOfDay) shouldGenerate = true;
    else if (tmpl.recurrence_type === "weekly" && differenceInDays(new Date(), lastGen) >= 7) shouldGenerate = true;
    else if (tmpl.recurrence_type === "monthly" && differenceInDays(new Date(), lastGen) >= 28) shouldGenerate = true;
    if (shouldGenerate) {
      await supabase.from("checklists").insert({
        business_id: businessId,
        sop_id: tmpl.sop_id,
        title: tmpl.title,
        items: tmpl.items,
        status: "pending",
        due_date: getTodayStr(),
        created_by: tmpl.created_by,
      });
      await supabase.from("checklists").update({ last_generated_at: new Date().toISOString() }).eq("id", tmpl.id);
    }
  }
}

// ─── Query keys ───────────────────────────────────

const dashboardKeys = {
  checklists: (businessId: string) => ["dashboard", "checklists", businessId] as const,
  todos: (userId: string) => ["dashboard", "todos", userId] as const,
  sopStats: (businessId: string) => ["dashboard", "sopStats", businessId] as const,
  recurring: (businessId: string) => ["dashboard", "recurring", businessId] as const,
};

// ─── Hook ─────────────────────────────────────────

export function useDashboard() {
  const queryClient = useQueryClient();
  const { currentBusiness } = useBusinessStore();
  const businessId = currentBusiness?.id;

  // Local UI state only
  const [todoText, setTodoText] = useState("");
  const [addingTodo, setAddingTodo] = useState(false);

  // Core queries — fire in parallel, share cache with sidebar
  const { data: user } = useQuery({
    queryKey: userKeys.current,
    queryFn: fetchCurrentUser,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const userId = user?.id;

  const { data: profile } = useQuery({
    queryKey: userKeys.profile(userId ?? ""),
    queryFn: () => fetchProfile(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  const { data: monthlyUsage = 0 } = useQuery({
    queryKey: usageKeys.monthly(userId ?? ""),
    queryFn: () => fetchMonthlyUsage(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  // Dashboard-specific queries
  const { data: checklists = [], isLoading: checklistsLoading } = useQuery({
    queryKey: dashboardKeys.checklists(businessId ?? ""),
    queryFn: () => fetchDashboardChecklists(businessId!),
    enabled: !!businessId,
  });

  const { data: todos = [], isLoading: todosLoading } = useQuery({
    queryKey: dashboardKeys.todos(userId ?? ""),
    queryFn: () => fetchDashboardTodos(userId!),
    enabled: !!userId,
  });

  const { data: sopStats, isLoading: sopsLoading } = useQuery({
    queryKey: dashboardKeys.sopStats(businessId ?? ""),
    queryFn: () => fetchDashboardSopStats(businessId!),
    enabled: !!businessId,
  });

  // Auto-generate recurring checklists (fire-and-forget, runs once per mount)
  useQuery({
    queryKey: dashboardKeys.recurring(businessId ?? ""),
    queryFn: () => generateRecurringChecklists(businessId!),
    enabled: !!businessId,
    staleTime: 5 * 60 * 1000, // only run every 5 min
  });

  // Derived data
  const userName = profile?.full_name || user?.email?.split("@")[0] || "";
  const planId = (profile?.plan_id as PlanId) ?? "free";
  const plan = plans[planId];
  const creditsLimit = plan.limits.aiCredits;
  const unlimitedCredits = creditsLimit === -1;

  const overdueChecklists = useMemo(
    () => checklists.filter((cl: any) => cl.due_date && cl.due_date < getTodayStr()),
    [checklists]
  );
  const todayChecklists = useMemo(
    () => checklists.filter((cl: any) => !cl.due_date || cl.due_date >= getTodayStr()),
    [checklists]
  );
  const overdueTodos = useMemo(
    () => todos.filter((t: any) => t.due_date && t.due_date < getTodayStr()),
    [todos]
  );
  const todayTodos = useMemo(
    () => todos.filter((t: any) => !t.due_date || t.due_date >= getTodayStr()),
    [todos]
  );

  const loading = !user || (!!businessId && (checklistsLoading || todosLoading || sopsLoading));

  // ─── Mutations ────────────────────────────────────

  const addTodoMutation = useMutation({
    mutationFn: async (text: string) => {
      const { data, error } = await supabase
        .from("todos")
        .insert({
          business_id: businessId,
          user_id: userId,
          text: text.trim(),
          due_date: getTodayStr(),
          priority: "normal",
          sort_order: todayTodos.length,
        })
        .select("id, text, completed, completed_at, due_date, priority, created_at")
        .single();
      if (error) throw error;
      return data;
    },
    onMutate: async (text) => {
      await queryClient.cancelQueries({ queryKey: dashboardKeys.todos(userId!) });
      const previous = queryClient.getQueryData(dashboardKeys.todos(userId!));
      queryClient.setQueryData(dashboardKeys.todos(userId!), (old: any[]) => [
        ...(old ?? []),
        { id: `temp-${Date.now()}`, text: text.trim(), completed: false, completed_at: null, due_date: getTodayStr(), priority: "normal", created_at: new Date().toISOString() },
      ]);
      return { previous };
    },
    onError: (_err, _text, context) => {
      queryClient.setQueryData(dashboardKeys.todos(userId!), context?.previous);
      toast.error("Failed to add todo");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.todos(userId!) });
      // Also invalidate the dedicated todos page cache
      queryClient.invalidateQueries({ queryKey: todoKeys.active(userId!) });
    },
  });

  const toggleTodoMutation = useMutation({
    mutationFn: async (todoId: string) => {
      const { error } = await supabase
        .from("todos")
        .update({ completed: true, completed_at: new Date().toISOString() })
        .eq("id", todoId);
      if (error) throw error;
    },
    onMutate: async (todoId) => {
      await queryClient.cancelQueries({ queryKey: dashboardKeys.todos(userId!) });
      const previous = queryClient.getQueryData(dashboardKeys.todos(userId!));
      queryClient.setQueryData(dashboardKeys.todos(userId!), (old: any[]) =>
        (old ?? []).filter((t: any) => t.id !== todoId)
      );
      return { previous };
    },
    onError: (_err, _todoId, context) => {
      queryClient.setQueryData(dashboardKeys.todos(userId!), context?.previous);
    },
    onSuccess: () => {
      toast.success("Todo completed");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.todos(userId!) });
      queryClient.invalidateQueries({ queryKey: todoKeys.active(userId!) });
      queryClient.invalidateQueries({ queryKey: todoKeys.completed(userId!) });
    },
  });

  const deleteTodoMutation = useMutation({
    mutationFn: async (todoId: string) => {
      const { error } = await supabase.from("todos").delete().eq("id", todoId);
      if (error) throw error;
    },
    onMutate: async (todoId) => {
      await queryClient.cancelQueries({ queryKey: dashboardKeys.todos(userId!) });
      const previous = queryClient.getQueryData(dashboardKeys.todos(userId!));
      queryClient.setQueryData(dashboardKeys.todos(userId!), (old: any[]) =>
        (old ?? []).filter((t: any) => t.id !== todoId)
      );
      return { previous };
    },
    onError: (_err, _todoId, context) => {
      queryClient.setQueryData(dashboardKeys.todos(userId!), context?.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.todos(userId!) });
      queryClient.invalidateQueries({ queryKey: todoKeys.active(userId!) });
    },
  });

  // Stable handlers
  async function handleAddTodo() {
    if (!todoText.trim() || !businessId || !userId) return;
    setAddingTodo(true);
    try {
      await addTodoMutation.mutateAsync(todoText);
      setTodoText("");
    } catch {
      // error handled in mutation
    }
    setAddingTodo(false);
  }

  function handleToggleTodo(todoId: string) {
    toggleTodoMutation.mutate(todoId);
  }

  function handleDeleteTodo(todoId: string) {
    deleteTodoMutation.mutate(todoId);
  }

  return {
    userName,
    loading,
    todosLoading,
    overdueChecklists,
    todayChecklists,
    overdueTodos,
    todayTodos,
    todoText,
    setTodoText,
    addingTodo,
    totalSops: sopStats?.total ?? 0,
    draftSops: sopStats?.draft ?? 0,
    publishedSops: sopStats?.published ?? 0,
    staleSops: sopStats?.stale ?? 0,
    teamCount: 1,
    creditsUsed: monthlyUsage,
    creditsLimit: unlimitedCredits ? -1 : creditsLimit,
    unlimitedCredits,
    handleAddTodo,
    handleToggleTodo,
    handleDeleteTodo,
  };
}

