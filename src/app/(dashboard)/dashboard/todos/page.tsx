"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { format, differenceInDays, isToday, isYesterday } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { useBusinessStore } from "@/hooks/use-business";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Trash2, Pencil, Loader2, ListTodo } from "lucide-react";
import { toast } from "sonner";

interface TodoRow {
  id: string;
  text: string;
  completed: boolean;
  completed_at: string | null;
  due_date: string | null;
  priority: string;
  sort_order: number;
  created_at: string;
}

export default function TodosPage() {
  const supabase = createClient();
  const { currentBusiness } = useBusinessStore();

  const [todos, setTodos] = useState<TodoRow[]>([]);
  const [completedTodos, setCompletedTodos] = useState<TodoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [newText, setNewText] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [todoCtxMenu, setTodoCtxMenu] = useState<{ x: number; y: number; todoId: string; completed: boolean } | null>(null);

  const todayStr = format(new Date(), "yyyy-MM-dd");

  const loadTodos = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [{ data: active }, { data: done }] = await Promise.all([
      supabase
        .from("todos")
        .select("id, text, completed, completed_at, due_date, priority, sort_order, created_at")
        .eq("user_id", user.id)
        .eq("completed", false)
        .order("sort_order"),
      supabase
        .from("todos")
        .select("id, text, completed, completed_at, due_date, priority, sort_order, created_at")
        .eq("user_id", user.id)
        .eq("completed", true)
        .order("completed_at", { ascending: false })
        .limit(20),
    ]);

    setTodos(active ?? []);
    setCompletedTodos(done ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadTodos();
  }, [loadTodos]);

  async function handleAdd() {
    if (!newText.trim() || !currentBusiness?.id) return;
    setAdding(true);
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("todos")
      .insert({
        business_id: currentBusiness.id,
        user_id: user?.id,
        text: newText.trim(),
        due_date: todayStr,
        priority: "normal",
        sort_order: todos.length,
      })
      .select("id, text, completed, completed_at, due_date, priority, sort_order, created_at")
      .single();

    if (error) toast.error(error.message);
    else if (data) {
      setTodos((prev) => [...prev, data]);
      setNewText("");
    }
    setAdding(false);
  }

  async function handleToggle(todoId: string, completed: boolean) {
    const now = new Date().toISOString();
    await supabase
      .from("todos")
      .update({ completed, completed_at: completed ? now : null })
      .eq("id", todoId);

    if (completed) {
      const todo = todos.find((t) => t.id === todoId);
      setTodos((prev) => prev.filter((t) => t.id !== todoId));
      if (todo) setCompletedTodos((prev) => [{ ...todo, completed: true, completed_at: now }, ...prev]);
      toast.success("Todo completed");
    } else {
      const todo = completedTodos.find((t) => t.id === todoId);
      setCompletedTodos((prev) => prev.filter((t) => t.id !== todoId));
      if (todo) setTodos((prev) => [...prev, { ...todo, completed: false, completed_at: null }]);
    }
  }

  async function handleDelete(todoId: string) {
    await supabase.from("todos").delete().eq("id", todoId);
    setTodos((prev) => prev.filter((t) => t.id !== todoId));
    setCompletedTodos((prev) => prev.filter((t) => t.id !== todoId));
  }

  async function handleEdit(todoId: string) {
    if (!editText.trim()) return;
    await supabase.from("todos").update({ text: editText.trim() }).eq("id", todoId);
    setTodos((prev) => prev.map((t) => t.id === todoId ? { ...t, text: editText.trim() } : t));
    setEditingId(null);
    setEditText("");
  }

  function carriedFromLabel(todo: TodoRow): string | null {
    if (!todo.due_date || todo.due_date >= todayStr) return null;
    const dueDate = new Date(todo.due_date + "T00:00:00");
    if (isYesterday(dueDate)) return "from yesterday";
    return `carried from ${format(dueDate, "MMM d")}`;
  }

  // Separate overdue and today's todos
  const overdueTodos = todos.filter((t) => t.due_date && t.due_date < todayStr);
  const todayTodos = todos.filter((t) => !t.due_date || t.due_date >= todayStr);

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
        <div className="h-10 animate-pulse rounded-md bg-muted" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded-md bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Todos</h1>
        <p className="text-muted-foreground">
          {format(new Date(), "EEEE, MMMM d")} — {todos.length} remaining
        </p>
      </div>

      {/* Add todo input */}
      <form
        onSubmit={(e) => { e.preventDefault(); handleAdd(); }}
        className="flex items-center gap-2"
      >
        <Input
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          placeholder="Add a todo and press Enter..."
          className="h-10"
          disabled={adding}
        />
        {adding && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </form>

      {/* Overdue todos */}
      {overdueTodos.length > 0 && (
        <div className="space-y-1">
          <h3 className="text-xs font-medium text-destructive uppercase tracking-wide px-1">
            Overdue ({overdueTodos.length})
          </h3>
          {overdueTodos.map((todo) => (
            <TodoItem
              key={todo.id}
              todo={todo}
              carried={carriedFromLabel(todo)}
              editing={editingId === todo.id}
              editText={editText}
              onToggle={() => handleToggle(todo.id, true)}
              onDelete={() => handleDelete(todo.id)}
              onStartEdit={() => { setEditingId(todo.id); setEditText(todo.text); }}
              onEditChange={setEditText}
              onEditSubmit={() => handleEdit(todo.id)}
              onEditCancel={() => setEditingId(null)}
              onContextMenu={(e) => { e.preventDefault(); setTodoCtxMenu({ x: e.clientX, y: e.clientY, todoId: todo.id, completed: todo.completed }); }}
            />
          ))}
        </div>
      )}

      {/* Today's todos */}
      <div className="space-y-1">
        {todayTodos.length === 0 && overdueTodos.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <ListTodo className="mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm font-medium text-foreground">All caught up!</p>
            <p className="mt-1 text-xs text-muted-foreground">Type above and press Enter to add a todo.</p>
          </div>
        )}
        {todayTodos.map((todo) => (
          <TodoItem
            key={todo.id}
            todo={todo}
            carried={null}
            editing={editingId === todo.id}
            editText={editText}
            onToggle={() => handleToggle(todo.id, true)}
            onDelete={() => handleDelete(todo.id)}
            onStartEdit={() => { setEditingId(todo.id); setEditText(todo.text); }}
            onEditChange={setEditText}
            onEditSubmit={() => handleEdit(todo.id)}
            onEditCancel={() => setEditingId(null)}
            onContextMenu={(e) => { e.preventDefault(); setTodoCtxMenu({ x: e.clientX, y: e.clientY, todoId: todo.id, completed: todo.completed }); }}
          />
        ))}
      </div>

      {todoCtxMenu && (
        <TodoContextMenu
          menu={todoCtxMenu}
          onClose={() => setTodoCtxMenu(null)}
          onComplete={() => { handleToggle(todoCtxMenu.todoId, !todoCtxMenu.completed); setTodoCtxMenu(null); }}
          onDelete={() => { handleDelete(todoCtxMenu.todoId); setTodoCtxMenu(null); }}
        />
      )}

      {/* Completed todos */}
      {completedTodos.length > 0 && (
        <div className="space-y-1">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-1">
            Completed ({completedTodos.length})
          </h3>
          {completedTodos.map((todo) => (
            <div
              key={todo.id}
              className="group flex items-center gap-3 rounded-md px-3 py-2 hover:bg-muted/50"
              onContextMenu={(e) => { e.preventDefault(); setTodoCtxMenu({ x: e.clientX, y: e.clientY, todoId: todo.id, completed: todo.completed }); }}
            >
              <button
                type="button"
                onClick={() => handleToggle(todo.id, false)}
                className="flex h-4 w-4 shrink-0 items-center justify-center rounded border border-emerald-400 bg-emerald-400/10"
              >
                <svg className="h-3 w-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </button>
              <span className="flex-1 text-sm text-muted-foreground line-through">{todo.text}</span>
              {todo.completed_at && (
                <span className="text-[10px] text-muted-foreground">
                  {format(new Date(todo.completed_at), "h:mm a")}
                </span>
              )}
              <button
                type="button"
                className="shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                onClick={() => handleDelete(todo.id)}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TodoContextMenu({ menu, onClose, onComplete, onDelete }: { menu: { x: number; y: number; completed: boolean }; onClose: () => void; onComplete: () => void; onDelete: () => void }) {
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
      <button type="button" className="flex w-full items-center gap-2 rounded-sm px-3 py-1.5 text-xs cursor-pointer hover:bg-muted text-foreground" onClick={onComplete}>
        {menu.completed ? "Undo complete" : "Complete"}
      </button>
      <button type="button" className="flex w-full items-center gap-2 rounded-sm px-3 py-1.5 text-xs cursor-pointer hover:bg-destructive/10 text-destructive" onClick={onDelete}>
        Delete
      </button>
    </div>
  );
}

function TodoItem({
  todo,
  carried,
  editing,
  editText,
  onToggle,
  onDelete,
  onStartEdit,
  onEditChange,
  onEditSubmit,
  onEditCancel,
  onContextMenu,
}: {
  todo: TodoRow;
  carried: string | null;
  editing: boolean;
  editText: string;
  onToggle: () => void;
  onDelete: () => void;
  onStartEdit: () => void;
  onEditChange: (v: string) => void;
  onEditSubmit: () => void;
  onEditCancel: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
}) {
  return (
    <div className="group flex items-center gap-3 rounded-md px-3 py-2 hover:bg-muted/50" onContextMenu={onContextMenu}>
      <button
        type="button"
        onClick={onToggle}
        className="flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded border border-muted-foreground/30 hover:border-primary hover:bg-primary/10 transition-all duration-200"
      />
      {editing ? (
        <form
          className="flex-1"
          onSubmit={(e) => { e.preventDefault(); onEditSubmit(); }}
        >
          <Input
            value={editText}
            onChange={(e) => onEditChange(e.target.value)}
            className="h-7 text-sm"
            autoFocus
            onBlur={onEditSubmit}
            onKeyDown={(e) => e.key === "Escape" && onEditCancel()}
          />
        </form>
      ) : (
        <span className="flex-1 text-sm">{todo.text}</span>
      )}
      {carried && (
        <span className="shrink-0 rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] text-destructive">
          {carried}
        </span>
      )}
      {!editing && (
        <>
          <button
            type="button"
            className="shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground"
            onClick={onStartEdit}
          >
            <Pencil className="h-3 w-3" />
          </button>
          <button
            type="button"
            className="shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </>
      )}
    </div>
  );
}
