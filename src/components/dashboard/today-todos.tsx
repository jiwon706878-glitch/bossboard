"use client";

import { Loader2, ListTodo, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface TodoRow {
  id: string;
  text: string;
  completed: boolean;
  completed_at: string | null;
  due_date: string | null;
  priority: string;
  created_at: string;
}

interface TodayTodosProps {
  todos: TodoRow[];
  todoText: string;
  setTodoText: (text: string) => void;
  addingTodo: boolean;
  onAddTodo: () => void;
  onToggleTodo: (todoId: string) => void;
  onDeleteTodo: (todoId: string) => void;
}

export function TodayTodos({
  todos,
  todoText,
  setTodoText,
  addingTodo,
  onAddTodo,
  onToggleTodo,
  onDeleteTodo,
}: TodayTodosProps) {
  return (
    <Card className="rounded-md border-l-[3px] border-l-emerald-400 shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <ListTodo className="h-4 w-4 text-emerald-400" />
          Today&apos;s Todos ({todos.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {/* Inline add */}
        <form onSubmit={(e) => { e.preventDefault(); onAddTodo(); }} className="flex items-center gap-2">
          <Input
            value={todoText}
            onChange={(e) => setTodoText(e.target.value)}
            placeholder="Add a todo..."
            className="h-8 text-sm"
          />
          {addingTodo && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </form>

        {todos.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">No todos for today. Type above and press Enter.</p>
        ) : (
          <div className="space-y-1">
            {todos.map((todo) => (
              <div key={todo.id} className="group flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted/50">
                <button
                  type="button"
                  onClick={() => onToggleTodo(todo.id)}
                  className="flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded border border-muted-foreground/30 hover:border-emerald-400 hover:bg-emerald-400/10 transition-colors"
                />
                <span className="flex-1 text-sm">{todo.text}</span>
                <button type="button" className="shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive" onClick={() => onDeleteTodo(todo.id)}>
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
