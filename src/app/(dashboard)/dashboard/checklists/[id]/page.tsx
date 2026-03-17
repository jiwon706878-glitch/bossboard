"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import {
  ArrowLeft,
  Check,
  CheckSquare,
  Square,
  Clock,
  Loader2,
  UserPlus,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ChecklistItem {
  text: string;
  required: boolean;
  assigned_to?: string | null;
  assigned_name?: string | null;
  status?: string; // unassigned, assigned, completed
}

interface Checklist {
  id: string;
  title: string;
  sop_id: string | null;
  items: ChecklistItem[];
  status: string;
  due_date: string | null;
  assigned_to: string | null;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  in_progress: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  completed: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  completed: "Completed",
};

export default function ChecklistDetailPage() {
  const supabase = createClient();
  const router = useRouter();
  const params = useParams();
  const checklistId = params.id as string;

  const [checklist, setChecklist] = useState<Checklist | null>(null);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string>("");

  const loadChecklist = useCallback(async () => {
    const { data, error } = await supabase
      .from("checklists")
      .select("*")
      .eq("id", checklistId)
      .single();

    if (error || !data) {
      toast.error("Checklist not found");
      router.push("/dashboard/checklists");
      return;
    }

    setChecklist(data);

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);

      // Get user name
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();
      setCurrentUserName(profile?.full_name || user.email?.split("@")[0] || "You");

      const { data: completion } = await supabase
        .from("checklist_completions")
        .select("items_completed")
        .eq("checklist_id", checklistId)
        .eq("completed_by", user.id)
        .order("completed_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (completion?.items_completed) {
        const indices = new Set<number>(
          (completion.items_completed as { item_index: number }[]).map((ic) => ic.item_index)
        );
        setChecked(indices);
      }
    }

    setLoading(false);
  }, [checklistId, supabase, router]);

  useEffect(() => {
    loadChecklist();
  }, [loadChecklist]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`checklist:${checklistId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "checklists",
          filter: `id=eq.${checklistId}`,
        },
        (payload) => {
          const updated = payload.new as Checklist;
          setChecklist(updated);
          setLastUpdated(new Date());
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [checklistId, supabase]);

  async function toggleItem(index: number) {
    if (!checklist || checklist.status === "completed") return;

    const next = new Set(checked);
    if (next.has(index)) {
      next.delete(index);
    } else {
      next.add(index);
    }
    setChecked(next);

    const totalItems = checklist.items.length;
    let newStatus = checklist.status;
    if (next.size === 0) {
      newStatus = "pending";
    } else if (next.size < totalItems) {
      newStatus = "in_progress";
    }

    if (newStatus !== checklist.status) {
      await supabase
        .from("checklists")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", checklistId);
      setChecklist({ ...checklist, status: newStatus });
    }
  }

  async function assignToMe(index: number) {
    if (!checklist || !currentUserId) return;

    const updatedItems = [...checklist.items];
    updatedItems[index] = {
      ...updatedItems[index],
      assigned_to: currentUserId,
      assigned_name: currentUserName,
      status: "assigned",
    };

    const { error } = await supabase
      .from("checklists")
      .update({ items: updatedItems, updated_at: new Date().toISOString() })
      .eq("id", checklistId);

    if (error) {
      toast.error(error.message);
      return;
    }

    setChecklist({ ...checklist, items: updatedItems });
    toast.success("Assigned to you");
  }

  async function handleComplete() {
    if (!checklist) return;
    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Not authenticated");
      setSaving(false);
      return;
    }

    const itemsCompleted = Array.from(checked).map((idx) => ({
      item_index: idx,
      completed_at: new Date().toISOString(),
    }));

    const { error: completionError } = await supabase
      .from("checklist_completions")
      .insert({
        checklist_id: checklistId,
        completed_by: user.id,
        items_completed: itemsCompleted,
        completed_at: new Date().toISOString(),
      });

    if (completionError) {
      toast.error(completionError.message);
      setSaving(false);
      return;
    }

    const { error: updateError } = await supabase
      .from("checklists")
      .update({ status: "completed", updated_at: new Date().toISOString() })
      .eq("id", checklistId);

    if (updateError) {
      toast.error(updateError.message);
      setSaving(false);
      return;
    }

    setChecklist({ ...checklist, status: "completed" });
    toast.success("Checklist completed!");
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-64 animate-pulse rounded-md border bg-card" />
      </div>
    );
  }

  if (!checklist) return null;

  const totalItems = checklist.items?.length ?? 0;
  const checkedCount = checked.size;
  const allChecked = totalItems > 0 && checkedCount === totalItems;
  const isCompleted = checklist.status === "completed";
  const progressPct = totalItems > 0 ? Math.round((checkedCount / totalItems) * 100) : 0;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link href="/dashboard/checklists">
          <Button variant="ghost" size="sm" className="mt-1">
            <ArrowLeft className="mr-1 h-4 w-4" /> Back
          </Button>
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-bold text-foreground">{checklist.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className={cn("text-xs", STATUS_COLORS[checklist.status])}>
              {STATUS_LABELS[checklist.status] ?? checklist.status}
            </Badge>
            {checklist.due_date && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                Due {format(new Date(checklist.due_date), "MMM d, yyyy")}
              </span>
            )}
            {checklist.sop_id && (
              <Link
                href={`/dashboard/sops/${checklist.sop_id}`}
                className="text-xs text-muted-foreground hover:text-foreground hover:underline"
              >
                View source SOP
              </Link>
            )}
            {lastUpdated && (
              <span className="text-[10px] text-muted-foreground">
                Updated {formatDistanceToNow(lastUpdated, { addSuffix: true })}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <div className="mb-1 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-mono text-sm font-semibold">{checkedCount}/{totalItems}</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-300",
              allChecked || isCompleted ? "bg-emerald-400" : "bg-primary"
            )}
            style={{ width: `${isCompleted ? 100 : progressPct}%` }}
          />
        </div>
      </div>

      {/* Checklist items */}
      <Card className="rounded-md shadow-none">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Checklist Items</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {(checklist.items ?? []).map((item, index) => {
            const isChecked = checked.has(index) || isCompleted;
            const isAssignedToMe = item.assigned_to === currentUserId;
            const isAssigned = !!item.assigned_to;

            return (
              <div
                key={index}
                className={cn(
                  "flex items-start gap-3 rounded-md px-3 py-2.5 transition-colors duration-150",
                  isCompleted ? "opacity-75" : "hover:bg-muted/50"
                )}
              >
                {/* Checkbox */}
                <button
                  type="button"
                  disabled={isCompleted}
                  onClick={() => toggleItem(index)}
                  className="mt-0.5 shrink-0 cursor-pointer transition-all duration-200"
                >
                  {isChecked ? (
                    <CheckSquare className="h-4 w-4 text-emerald-400 scale-110" />
                  ) : (
                    <Square className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>

                {/* Text + assignment info */}
                <div className="min-w-0 flex-1">
                  <span className={cn("text-sm transition-all duration-200", isChecked && "line-through text-muted-foreground opacity-60")}>
                    {item.text}
                  </span>
                  {isAssigned && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      ({item.assigned_name ?? "Assigned"}{item.status === "assigned" ? " - in progress" : ""})
                    </span>
                  )}
                </div>

                {/* Assign to me button */}
                {!isCompleted && !isAssigned && !isChecked && (
                  <button
                    type="button"
                    onClick={() => assignToMe(index)}
                    className="flex shrink-0 items-center gap-1 rounded px-2 py-0.5 text-[10px] text-muted-foreground transition-colors duration-100 hover:bg-muted hover:text-foreground"
                    title="Assign to me"
                  >
                    <UserPlus className="h-3 w-3" />
                  </button>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Complete button */}
      {!isCompleted && (
        <div className="flex items-center gap-3">
          <Button onClick={handleComplete} disabled={!allChecked || saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {saving ? "Saving..." : "Mark as Completed"}
          </Button>
          {!allChecked && (
            <p className="text-xs text-muted-foreground">Check all items to complete</p>
          )}
        </div>
      )}

      {isCompleted && (
        <div className="flex items-center gap-2 rounded-md border border-l-[3px] border-border border-l-emerald-400 bg-accent px-4 py-3 text-sm">
          <Check className="h-4 w-4 text-emerald-400" />
          <span>This checklist has been completed.</span>
        </div>
      )}
    </div>
  );
}
