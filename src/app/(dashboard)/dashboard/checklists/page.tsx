"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNow, format, isToday, isPast } from "date-fns";
import {
  CheckSquare,
  Clock,
  AlertTriangle,
  Plus,
  Loader2,
  Trash2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useBusinessStore } from "@/hooks/use-business";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Checklist {
  id: string;
  title: string;
  sop_id: string | null;
  items: { text: string; required: boolean }[];
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

function ChecklistContextMenu({ menu, onClose, onOpen, onDelete }: { menu: { x: number; y: number }; onClose: () => void; onOpen: () => void; onDelete: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h1 = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    const h2 = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", h1);
    document.addEventListener("keydown", h2);
    return () => { document.removeEventListener("mousedown", h1); document.removeEventListener("keydown", h2); };
  }, [onClose]);

  return (
    <div ref={ref} className="fixed z-50 w-40 rounded-md border bg-popover p-1 shadow-md"
      style={{ left: Math.min(menu.x, window.innerWidth - 170), top: Math.min(menu.y, window.innerHeight - 100) }}>
      <button type="button" className="flex w-full items-center gap-2 rounded-sm px-3 py-1.5 text-xs cursor-pointer hover:bg-muted text-foreground" onClick={onOpen}>
        Open
      </button>
      <button type="button" className="flex w-full items-center gap-2 rounded-sm px-3 py-1.5 text-xs cursor-pointer hover:bg-destructive/10 text-destructive" onClick={onDelete}>
        Delete
      </button>
    </div>
  );
}

export default function ChecklistsPage() {
  const supabase = createClient();
  const router = useRouter();
  const { currentBusiness } = useBusinessStore();
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [clCtxMenu, setClCtxMenu] = useState<{ x: number; y: number; id: string } | null>(null);

  const loadChecklists = useCallback(async () => {
    if (!currentBusiness?.id) return;

    const { data, error } = await supabase
      .from("checklists")
      .select("id, title, status, due_date, items, assigned_to, recurrence_type, sop_id, created_at")
      .eq("business_id", currentBusiness.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load checklists");
      return;
    }

    setChecklists(data ?? []);
    setLoading(false);
  }, [currentBusiness?.id, supabase]);

  useEffect(() => {
    loadChecklists();
  }, [loadChecklists]);

  async function handleDelete(id: string) {
    setDeletingId(id);
    const { error } = await supabase.from("checklists").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      setDeletingId(null);
      return;
    }
    setChecklists((prev) => prev.filter((c) => c.id !== id));
    setDeletingId(null);
    toast.success("Checklist deleted");
  }

  const dueToday = checklists.filter(
    (c) =>
      c.status !== "completed" && c.due_date && isToday(new Date(c.due_date))
  );
  const overdue = checklists.filter(
    (c) =>
      c.status !== "completed" &&
      c.due_date &&
      isPast(new Date(c.due_date)) &&
      !isToday(new Date(c.due_date))
  );

  if (loading) {
    return (
      <div className="mx-auto max-w-[1080px] space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-md border bg-card"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1080px] space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Checklists</h1>
          <p className="text-muted-foreground">
            Daily executable checklists from your SOPs.
          </p>
        </div>
        <Button asChild className="gap-2 active:scale-[0.98]">
          <Link href="/dashboard/checklists/new">
            <Plus className="h-4 w-4" />
            New Checklist
          </Link>
        </Button>
      </div>

      {/* Summary cards */}
      {(dueToday.length > 0 || overdue.length > 0) && (
        <div className="flex gap-4">
          {dueToday.length > 0 && (
            <div className="flex items-center gap-2 rounded-md border border-l-[3px] border-border border-l-primary bg-accent px-4 py-2 text-sm">
              <Clock className="h-4 w-4 text-primary" />
              <span className="font-mono font-semibold">{dueToday.length}</span>
              <span className="text-muted-foreground">due today</span>
            </div>
          )}
          {overdue.length > 0 && (
            <div className="flex items-center gap-2 rounded-md border border-l-[3px] border-border border-l-destructive bg-accent px-4 py-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <span className="font-mono font-semibold">{overdue.length}</span>
              <span className="text-muted-foreground">overdue</span>
            </div>
          )}
        </div>
      )}

      {checklists.length === 0 ? (
        <Card className="rounded-md shadow-none">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <CheckSquare className="mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              No checklists yet. Create one to get started.
            </p>
            <Button asChild variant="outline" size="sm" className="mt-4">
              <Link href="/dashboard/checklists/new">
                <Plus className="mr-1 h-3.5 w-3.5" /> Create Checklist
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {checklists.map((checklist) => {
            const itemCount = checklist.items?.length ?? 0;
            const isDueToday =
              checklist.due_date && isToday(new Date(checklist.due_date));
            const isOverdue =
              checklist.due_date &&
              isPast(new Date(checklist.due_date)) &&
              !isToday(new Date(checklist.due_date)) &&
              checklist.status !== "completed";

            return (
              <Card
                key={checklist.id}
                className={cn(
                  "rounded-md shadow-none transition-colors duration-150 hover:bg-muted/30",
                  isOverdue && "border-l-2"
                )}
                style={isOverdue ? { borderLeftColor: "var(--destructive)" } : undefined}
                onContextMenu={(e) => { e.preventDefault(); setClCtxMenu({ x: e.clientX, y: e.clientY, id: checklist.id }); }}
              >
                <CardContent className="flex items-center gap-4 py-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/dashboard/checklists/${checklist.id}`}
                        className="truncate text-sm font-medium text-foreground hover:underline"
                      >
                        {checklist.title}
                      </Link>
                      <Badge
                        variant="secondary"
                        className={cn(
                          "shrink-0 text-xs",
                          STATUS_COLORS[checklist.status]
                        )}
                      >
                        {STATUS_LABELS[checklist.status] ?? checklist.status}
                      </Badge>
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{itemCount} items</span>
                      {checklist.due_date && (
                        <span
                          className={cn(
                            "flex items-center gap-1",
                            isOverdue && "text-red-400",
                            isDueToday && "text-blue-400"
                          )}
                        >
                          <Clock className="h-3 w-3" />
                          {isDueToday
                            ? "Due today"
                            : isOverdue
                              ? `Overdue (${format(new Date(checklist.due_date), "MMM d")})`
                              : `Due ${format(new Date(checklist.due_date), "MMM d")}`}
                        </span>
                      )}
                      <span>
                        Created{" "}
                        {formatDistanceToNow(new Date(checklist.created_at), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/dashboard/checklists/${checklist.id}`}>
                        {checklist.status === "completed" ? "View" : "Open"}
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-destructive"
                      disabled={deletingId === checklist.id}
                      onClick={() => handleDelete(checklist.id)}
                    >
                      {deletingId === checklist.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {clCtxMenu && (
        <ChecklistContextMenu
          menu={clCtxMenu}
          onClose={() => setClCtxMenu(null)}
          onOpen={() => { router.push(`/dashboard/checklists/${clCtxMenu.id}`); setClCtxMenu(null); }}
          onDelete={() => { handleDelete(clCtxMenu.id); setClCtxMenu(null); }}
        />
      )}
    </div>
  );
}
