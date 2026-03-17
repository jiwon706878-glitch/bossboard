"use client";

import Link from "next/link";
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
}

export function OverdueSection({
  overdueChecklists,
  overdueTodos,
  onToggleTodo,
}: OverdueSectionProps) {
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
                onClick={() => onToggleTodo(todo.id)}
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
  );
}
