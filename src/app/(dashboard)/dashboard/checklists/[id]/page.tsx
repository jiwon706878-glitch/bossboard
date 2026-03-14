"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import {
  ArrowLeft,
  Check,
  CheckSquare,
  Square,
  Clock,
  Loader2,
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

    // Load existing completion if any
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
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
          (
            completion.items_completed as { item_index: number }[]
          ).map((ic) => ic.item_index)
        );
        setChecked(indices);
      }
    }

    setLoading(false);
  }, [checklistId, supabase, router]);

  useEffect(() => {
    loadChecklist();
  }, [loadChecklist]);

  async function toggleItem(index: number) {
    if (!checklist || checklist.status === "completed") return;

    const next = new Set(checked);
    if (next.has(index)) {
      next.delete(index);
    } else {
      next.add(index);
    }
    setChecked(next);

    // Update status based on progress
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

  async function handleComplete() {
    if (!checklist) return;
    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Not authenticated");
      setSaving(false);
      return;
    }

    const itemsCompleted = Array.from(checked).map((idx) => ({
      item_index: idx,
      completed_at: new Date().toISOString(),
    }));

    // Save completion record
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

    // Update checklist status
    const { error: updateError } = await supabase
      .from("checklists")
      .update({
        status: "completed",
        updated_at: new Date().toISOString(),
      })
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
          <h1 className="text-3xl font-bold text-foreground">
            {checklist.title}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge
              variant="secondary"
              className={cn("text-xs", STATUS_COLORS[checklist.status])}
            >
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
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <div className="mb-1 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-mono text-sm font-semibold">
            {checkedCount}/{totalItems}
          </span>
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
            return (
              <button
                key={index}
                type="button"
                disabled={isCompleted}
                onClick={() => toggleItem(index)}
                className={cn(
                  "flex w-full items-start gap-3 rounded-md px-3 py-2.5 text-left transition-colors duration-150",
                  isCompleted
                    ? "cursor-default opacity-75"
                    : "hover:bg-muted/50",
                  isChecked && !isCompleted && "opacity-60"
                )}
              >
                <div className="mt-0.5 shrink-0">
                  {isChecked ? (
                    <CheckSquare
                      className="h-4 w-4 text-emerald-400"
                    />
                  ) : (
                    <Square className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <span
                  className={cn(
                    "text-sm",
                    isChecked && "line-through text-muted-foreground"
                  )}
                >
                  {item.text}
                </span>
              </button>
            );
          })}
        </CardContent>
      </Card>

      {/* Complete button */}
      {!isCompleted && (
        <div className="flex items-center gap-3">
          <Button
            onClick={handleComplete}
            disabled={!allChecked || saving}
            className="gap-2"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            {saving ? "Saving..." : "Mark as Completed"}
          </Button>
          {!allChecked && (
            <p className="text-xs text-muted-foreground">
              Check all items to complete
            </p>
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
