"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { differenceInDays } from "date-fns";
import { AlertTriangle, CheckSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

interface OverdueSectionProps {
  overdueChecklists: ChecklistRow[];
  overdueTodos: TodoRow[];
  onToggleTodo: (todoId: string) => void;
  onDeleteTodo?: (todoId: string) => void;
}

function OverdueContextMenu({ menu, onClose, actions }: { menu: { x: number; y: number }; onClose: () => void; actions: { label: string; onClick: () => void; destructive?: boolean }[] }) {
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
      {actions.map((a) => (
        <button key={a.label} type="button" className={`flex w-full items-center gap-2 rounded-sm px-3 py-1.5 text-xs cursor-pointer ${a.destructive ? "hover:bg-destructive/10 text-destructive" : "hover:bg-muted text-foreground"}`} onClick={a.onClick}>
          {a.label}
        </button>
      ))}
    </div>
  );
}

export function OverdueSection({
  overdueChecklists,
  overdueTodos,
  onToggleTodo,
  onDeleteTodo,
}: OverdueSectionProps) {
  const router = useRouter();
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; type: "checklist" | "todo"; id: string } | null>(null);
  const totalOverdue = overdueChecklists.length + overdueTodos.length;

  if (totalOverdue === 0) return null;

  return (
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
            <Link key={cl.id} href={`/dashboard/checklists/${cl.id}`} className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-muted/50 transition-colors"
              onContextMenu={(e) => { e.preventDefault(); setCtxMenu({ x: e.clientX, y: e.clientY, type: "checklist", id: cl.id }); }}>
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
            <div key={todo.id} className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-muted/50"
              onContextMenu={(e) => { e.preventDefault(); setCtxMenu({ x: e.clientX, y: e.clientY, type: "todo", id: todo.id }); }}>
              <button
                type="button"
                onClick={() => onToggleTodo(todo.id)}
                className="flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded border border-destructive/40 hover:border-primary hover:bg-primary/10 transition-colors"
              />
              <span className="flex-1 text-sm">{todo.text}</span>
              <span className="text-xs text-destructive">
                overdue {daysOverdue} day{daysOverdue !== 1 ? "s" : ""}
              </span>
            </div>
          );
        })}
      </CardContent>

      {ctxMenu && ctxMenu.type === "checklist" && (
        <OverdueContextMenu
          menu={ctxMenu}
          onClose={() => setCtxMenu(null)}
          actions={[
            { label: "Open", onClick: () => { router.push(`/dashboard/checklists/${ctxMenu.id}`); setCtxMenu(null); } },
          ]}
        />
      )}
      {ctxMenu && ctxMenu.type === "todo" && (
        <OverdueContextMenu
          menu={ctxMenu}
          onClose={() => setCtxMenu(null)}
          actions={[
            { label: "Mark complete", onClick: () => { onToggleTodo(ctxMenu.id); setCtxMenu(null); } },
            ...(onDeleteTodo ? [{ label: "Delete", onClick: () => { onDeleteTodo(ctxMenu.id); setCtxMenu(null); }, destructive: true }] : []),
          ]}
        />
      )}
    </Card>
  );
}
