"use client";

import { useEffect, useState } from "react";
import { format, differenceInDays } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { useBusinessStore } from "@/hooks/use-business";
import { plans, type PlanId } from "@/config/plans";
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

export function useDashboard() {
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
  const [totalSops, setTotalSops] = useState(0);
  const [draftSops, setDraftSops] = useState(0);
  const [publishedSops, setPublishedSops] = useState(0);
  const [staleSops, setStaleSops] = useState(0);
  const [teamCount, setTeamCount] = useState(0);
  const [creditsUsed, setCreditsUsed] = useState(0);
  const [creditsLimit, setCreditsLimit] = useState(30);
  const [unlimitedCredits, setUnlimitedCredits] = useState(false);

  const todayStr = format(new Date(), "yyyy-MM-dd");

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase.from("profiles").select("full_name, plan_id").eq("id", user.id).single();
        setUserName(profile?.full_name || user.email?.split("@")[0] || "User");

        const planId = (profile?.plan_id as PlanId) ?? "free";
        const plan = plans[planId];
        const limit = plan.limits.aiCredits;
        if (limit === -1) setUnlimitedCredits(true);
        else setCreditsLimit(limit);

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const { data: usage } = await supabase.from("ai_usage").select("credits_used").eq("user_id", user.id).gte("created_at", startOfMonth.toISOString());
        setCreditsUsed(usage?.reduce((sum, r) => sum + r.credits_used, 0) ?? 0);

        const businessId = currentBusiness?.id;
        if (!businessId) return;

        const { data: allChecklists } = await supabase.from("checklists").select("id, title, status, due_date, items, assigned_to").eq("business_id", businessId).neq("status", "completed").order("due_date");
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
        const { data: recurringTemplates } = await supabase.from("checklists").select("id, sop_id, title, items, recurrence_type, recurrence_days, last_generated_at, created_by").eq("business_id", businessId).eq("is_template", true).neq("recurrence_type", "none");
        if (recurringTemplates) {
          for (const tmpl of recurringTemplates) {
            const lastGen = tmpl.last_generated_at ? new Date(tmpl.last_generated_at) : null;
            let shouldGenerate = false;
            if (!lastGen) shouldGenerate = true;
            else if (tmpl.recurrence_type === "daily" && lastGen < startOfDay) shouldGenerate = true;
            else if (tmpl.recurrence_type === "weekly" && differenceInDays(new Date(), lastGen) >= 7) shouldGenerate = true;
            else if (tmpl.recurrence_type === "monthly" && differenceInDays(new Date(), lastGen) >= 28) shouldGenerate = true;
            if (shouldGenerate) {
              await supabase.from("checklists").insert({ business_id: businessId, sop_id: tmpl.sop_id, title: tmpl.title, items: tmpl.items, status: "pending", due_date: todayStr, created_by: tmpl.created_by });
              await supabase.from("checklists").update({ last_generated_at: new Date().toISOString() }).eq("id", tmpl.id);
            }
          }
        }

        const { data: todoData } = await supabase.from("todos").select("id, text, completed, completed_at, due_date, priority, created_at").eq("user_id", user.id).eq("completed", false).order("sort_order").limit(30);
        if (todoData) {
          setOverdueTodos(todoData.filter((t) => t.due_date && t.due_date < todayStr));
          setTodayTodos(todoData.filter((t) => !t.due_date || t.due_date >= todayStr));
        }

        const { data: sops } = await supabase.from("sops").select("id, status, updated_at").eq("business_id", businessId).is("deleted_at", null);
        if (sops) {
          setTotalSops(sops.length);
          setDraftSops(sops.filter((s) => s.status === "draft").length);
          setPublishedSops(sops.filter((s) => s.status === "published").length);
          const staleThreshold = Date.now() - 90 * 24 * 60 * 60 * 1000;
          setStaleSops(sops.filter((s) => s.updated_at && new Date(s.updated_at).getTime() < staleThreshold).length);
        }

        // profiles table has no business_id column — count owner as 1 for now
        setTeamCount(1);
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
    const { data, error } = await supabase.from("todos").insert({ business_id: currentBusiness.id, user_id: user?.id, text: todoText.trim(), due_date: todayStr, priority: "normal", sort_order: todayTodos.length }).select("id, text, completed, completed_at, due_date, priority, created_at").single();
    if (error) toast.error(error.message);
    else if (data) { setTodayTodos((prev) => [...prev, data]); setTodoText(""); }
    setAddingTodo(false);
  }

  async function handleToggleTodo(todoId: string) {
    await supabase.from("todos").update({ completed: true, completed_at: new Date().toISOString() }).eq("id", todoId);
    setTodayTodos((prev) => prev.filter((t) => t.id !== todoId));
    setOverdueTodos((prev) => prev.filter((t) => t.id !== todoId));
    toast.success("Todo completed");
  }

  async function handleDeleteTodo(todoId: string) {
    await supabase.from("todos").delete().eq("id", todoId);
    setTodayTodos((prev) => prev.filter((t) => t.id !== todoId));
    setOverdueTodos((prev) => prev.filter((t) => t.id !== todoId));
  }

  return {
    userName, loading,
    overdueChecklists, todayChecklists, overdueTodos, todayTodos,
    todoText, setTodoText, addingTodo,
    totalSops, draftSops, publishedSops, staleSops, teamCount,
    creditsUsed, creditsLimit, unlimitedCredits,
    handleAddTodo, handleToggleTodo, handleDeleteTodo,
  };
}
