"use client";

import { useState, useRef, useEffect, memo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, isYesterday } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { useBusinessStore } from "@/hooks/use-business";
import { fetchCurrentUser, fetchActiveTodos, fetchCompletedTodos, userKeys, todoKeys } from "@/lib/queries";
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

const supabase = createClient();
function getTodayStr() { return format(new Date(), "yyyy-MM-dd"); }

export default function TodosPage() {
  const queryClient = useQueryClient();
  const { currentBusiness } = useBusinessStore();

  const [newText, setNewText] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [todoCtxMenu, setTodoCtxMenu] = useState<{ x: number; y: number; todoId: string; completed: boolean } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: user } = useQuery({ queryKey: userKeys.current, queryFn: fetchCurrentUser, retry: false });
  const userId = user?.id;

  const { data: todos = [] as TodoRow[], isLoading: todosLoading } = useQuery<TodoRow[]>({
    queryKey: todoKeys.active(userId ?? ""),
    queryFn: () => fetchActiveTodos(userId!) as Promise<TodoRow[]>,
    enabled: !!userId,
  });

  const { data: completedTodos = [] as TodoRow[], isLoading: completedLoading } = useQuery<TodoRow[]>({
    queryKey: todoKeys.completed(userId ?? ""),
    queryFn: () => fetchCompletedTodos(userId!) as Promise<TodoRow[]>,
    enabled: !!userId,
  });

  // Mutations
  const addMutation = useMutation({
    mutationFn: async (text: string) => {
      const { data, error } = await supabase
        .from("todos")
        .insert({ business_id: currentBusiness?.id, user_id: userId, text: text.trim(), due_date: getTodayStr(), priority: "normal", sort_order: todos.length })
        .select("id, text, completed, completed_at, due_date, priority, sort_order, created_at")
        .single();
      if (error) throw error;
      return data;
    },
    onMutate: async (text) => {
      await queryClient.cancelQueries({ queryKey: todoKeys.active(userId!) });
      const prev = queryClient.getQueryData<TodoRow[]>(todoKeys.active(userId!));
      queryClient.setQueryData<TodoRow[]>(todoKeys.active(userId!), (old) => [
        ...(old ?? []),
        { id: `temp-${Date.now()}`, text: text.trim(), completed: false, completed_at: null, due_date: getTodayStr(), priority: "normal", sort_order: (old?.length ?? 0), created_at: new Date().toISOString() },
      ]);
      return { prev };
    },
    onError: (_err, _text, ctx) => {
      queryClient.setQueryData(todoKeys.active(userId!), ctx?.prev);
      toast.error("Failed to add todo");
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: todoKeys.active(userId!) }),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ todoId, completed }: { todoId: string; completed: boolean }) => {
      const now = new Date().toISOString();
      const { error } = await supabase.from("todos").update({ completed, completed_at: completed ? now : null }).eq("id", todoId);
      if (error) throw error;
      return { todoId, completed, now };
    },
    onMutate: async ({ todoId, completed }) => {
      await queryClient.cancelQueries({ queryKey: todoKeys.active(userId!) });
      await queryClient.cancelQueries({ queryKey: todoKeys.completed(userId!) });
      const prevActive = queryClient.getQueryData<TodoRow[]>(todoKeys.active(userId!));
      const prevCompleted = queryClient.getQueryData<TodoRow[]>(todoKeys.completed(userId!));
      if (completed) {
        const todo = prevActive?.find((t) => t.id === todoId);
        queryClient.setQueryData<TodoRow[]>(todoKeys.active(userId!), (old) => (old ?? []).filter((t) => t.id !== todoId));
        if (todo) queryClient.setQueryData<TodoRow[]>(todoKeys.completed(userId!), (old) => [{ ...todo, completed: true, completed_at: new Date().toISOString() }, ...(old ?? [])]);
      } else {
        const todo = prevCompleted?.find((t) => t.id === todoId);
        queryClient.setQueryData<TodoRow[]>(todoKeys.completed(userId!), (old) => (old ?? []).filter((t) => t.id !== todoId));
        if (todo) queryClient.setQueryData<TodoRow[]>(todoKeys.active(userId!), (old) => [...(old ?? []), { ...todo, completed: false, completed_at: null }]);
      }
      return { prevActive, prevCompleted };
    },
    onError: (_err, _vars, ctx) => {
      queryClient.setQueryData(todoKeys.active(userId!), ctx?.prevActive);
      queryClient.setQueryData(todoKeys.completed(userId!), ctx?.prevCompleted);
    },
    onSuccess: (_, { completed }) => { if (completed) toast.success("Todo completed"); },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: todoKeys.active(userId!) });
      queryClient.invalidateQueries({ queryKey: todoKeys.completed(userId!) });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (todoId: string) => {
      const { error } = await supabase.from("todos").delete().eq("id", todoId);
      if (error) throw error;
    },
    onMutate: async (todoId) => {
      await queryClient.cancelQueries({ queryKey: todoKeys.active(userId!) });
      await queryClient.cancelQueries({ queryKey: todoKeys.completed(userId!) });
      const prevActive = queryClient.getQueryData<TodoRow[]>(todoKeys.active(userId!));
      const prevCompleted = queryClient.getQueryData<TodoRow[]>(todoKeys.completed(userId!));
      queryClient.setQueryData<TodoRow[]>(todoKeys.active(userId!), (old) => (old ?? []).filter((t) => t.id !== todoId));
      queryClient.setQueryData<TodoRow[]>(todoKeys.completed(userId!), (old) => (old ?? []).filter((t) => t.id !== todoId));
      return { prevActive, prevCompleted };
    },
    onError: (_err, _todoId, ctx) => {
      queryClient.setQueryData(todoKeys.active(userId!), ctx?.prevActive);
      queryClient.setQueryData(todoKeys.completed(userId!), ctx?.prevCompleted);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: todoKeys.active(userId!) });
      queryClient.invalidateQueries({ queryKey: todoKeys.completed(userId!) });
    },
  });

  const editMutation = useMutation({
    mutationFn: async ({ todoId, text }: { todoId: string; text: string }) => {
      const { error } = await supabase.from("todos").update({ text }).eq("id", todoId);
      if (error) throw error;
    },
    onMutate: async ({ todoId, text }) => {
      await queryClient.cancelQueries({ queryKey: todoKeys.active(userId!) });
      const prev = queryClient.getQueryData<TodoRow[]>(todoKeys.active(userId!));
      queryClient.setQueryData<TodoRow[]>(todoKeys.active(userId!), (old) => (old ?? []).map((t) => t.id === todoId ? { ...t, text } : t));
      return { prev };
    },
    onError: (_err, _vars, ctx) => queryClient.setQueryData(todoKeys.active(userId!), ctx?.prev),
    onSettled: () => queryClient.invalidateQueries({ queryKey: todoKeys.active(userId!) }),
  });

  async function handleAdd() {
    if (!newText.trim() || !currentBusiness?.id || !userId) return;
    setAdding(true);
    try { await addMutation.mutateAsync(newText); setNewText(""); } catch {}
    setAdding(false);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function handleToggle(todoId: string, completed: boolean) { toggleMutation.mutate({ todoId, completed }); }
  function handleDelete(todoId: string) { deleteMutation.mutate(todoId); }
  function handleEdit(todoId: string) {
    if (!editText.trim()) return;
    editMutation.mutate({ todoId, text: editText.trim() });
    setEditingId(null);
    setEditText("");
  }

  function carriedFromLabel(todo: TodoRow): string | null {
    if (!todo.due_date || todo.due_date >= getTodayStr()) return null;
    const dueDate = new Date(todo.due_date + "T00:00:00");
    if (isYesterday(dueDate)) return "from yesterday";
    return `carried from ${format(dueDate, "MMM d")}`;
  }

  const overdueTodos = todos.filter((t: TodoRow) => t.due_date && t.due_date < getTodayStr());
  const todayTodos = todos.filter((t: TodoRow) => !t.due_date || t.due_date >= getTodayStr());
  const loading = todosLoading || completedLoading;

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
        <div className="h-10 animate-pulse rounded-md bg-muted" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (<div key={i} className="h-10 animate-pulse rounded-md bg-muted" />))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Todos</h1>
        <p className="text-muted-foreground">{format(new Date(), "EEEE, MMMM d")} — {todos.length} remaining</p>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); handleAdd(); }} className="flex items-center gap-2">
        <Input ref={inputRef} value={newText} onChange={(e) => setNewText(e.target.value)} placeholder="Add a todo and press Enter..." className="h-10" autoFocus />
        {adding && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </form>

      {overdueTodos.length > 0 && (
        <div className="space-y-1">
          <h3 className="text-xs font-medium text-destructive uppercase tracking-wide px-1">Overdue ({overdueTodos.length})</h3>
          {overdueTodos.map((todo) => (
            <TodoItem key={todo.id} todo={todo} carried={carriedFromLabel(todo)} editing={editingId === todo.id} editText={editText}
              onToggle={() => handleToggle(todo.id, true)} onDelete={() => handleDelete(todo.id)}
              onStartEdit={() => { setEditingId(todo.id); setEditText(todo.text); }} onEditChange={setEditText}
              onEditSubmit={() => handleEdit(todo.id)} onEditCancel={() => setEditingId(null)}
              onContextMenu={(e) => { e.preventDefault(); setTodoCtxMenu({ x: e.clientX, y: e.clientY, todoId: todo.id, completed: todo.completed }); }} />
          ))}
        </div>
      )}

      <div className="space-y-1">
        {todayTodos.length === 0 && overdueTodos.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <ListTodo className="mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm font-medium text-foreground">All caught up!</p>
            <p className="mt-1 text-xs text-muted-foreground">Type above and press Enter to add a todo.</p>
          </div>
        )}
        {todayTodos.map((todo) => (
          <TodoItem key={todo.id} todo={todo} carried={null} editing={editingId === todo.id} editText={editText}
            onToggle={() => handleToggle(todo.id, true)} onDelete={() => handleDelete(todo.id)}
            onStartEdit={() => { setEditingId(todo.id); setEditText(todo.text); }} onEditChange={setEditText}
            onEditSubmit={() => handleEdit(todo.id)} onEditCancel={() => setEditingId(null)}
            onContextMenu={(e) => { e.preventDefault(); setTodoCtxMenu({ x: e.clientX, y: e.clientY, todoId: todo.id, completed: todo.completed }); }} />
        ))}
      </div>

      {todoCtxMenu && (
        <TodoContextMenu menu={todoCtxMenu} onClose={() => setTodoCtxMenu(null)}
          onComplete={() => { handleToggle(todoCtxMenu.todoId, !todoCtxMenu.completed); setTodoCtxMenu(null); }}
          onDelete={() => { handleDelete(todoCtxMenu.todoId); setTodoCtxMenu(null); }} />
      )}

      {completedTodos.length > 0 && (
        <div className="space-y-1">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-1">Completed ({completedTodos.length})</h3>
          {completedTodos.map((todo) => (
            <div key={todo.id} className="group flex items-center gap-3 rounded-md px-3 py-2 hover:bg-muted/50"
              onContextMenu={(e) => { e.preventDefault(); setTodoCtxMenu({ x: e.clientX, y: e.clientY, todoId: todo.id, completed: todo.completed }); }}>
              <button type="button" onClick={() => handleToggle(todo.id, false)} className="flex h-4 w-4 shrink-0 items-center justify-center rounded border border-emerald-400 bg-emerald-400/10">
                <svg className="h-3 w-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              </button>
              <span className="flex-1 text-sm text-muted-foreground line-through">{todo.text}</span>
              {todo.completed_at && <span className="text-[10px] text-muted-foreground">{format(new Date(todo.completed_at), "h:mm a")}</span>}
              <button type="button" className="shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(todo.id)} aria-label="Delete todo"><Trash2 className="h-3 w-3" /></button>
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
    document.addEventListener("mousedown", h1); document.addEventListener("keydown", h2);
    return () => { document.removeEventListener("mousedown", h1); document.removeEventListener("keydown", h2); };
  }, [onClose]);
  return (
    <div ref={ref} className="fixed z-50 w-40 rounded-md border bg-popover p-1 shadow-md" style={{ left: Math.min(menu.x, window.innerWidth - 170), top: Math.min(menu.y, window.innerHeight - 100) }}>
      <button type="button" className="flex w-full items-center gap-2 rounded-sm px-3 py-1.5 text-xs cursor-pointer hover:bg-muted text-foreground" onClick={onComplete}>{menu.completed ? "Undo complete" : "Complete"}</button>
      <button type="button" className="flex w-full items-center gap-2 rounded-sm px-3 py-1.5 text-xs cursor-pointer hover:bg-destructive/10 text-destructive" onClick={onDelete}>Delete</button>
    </div>
  );
}

const TodoItem = memo(function TodoItem({ todo, carried, editing, editText, onToggle, onDelete, onStartEdit, onEditChange, onEditSubmit, onEditCancel, onContextMenu }: {
  todo: TodoRow; carried: string | null; editing: boolean; editText: string; onToggle: () => void; onDelete: () => void; onStartEdit: () => void;
  onEditChange: (v: string) => void; onEditSubmit: () => void; onEditCancel: () => void; onContextMenu?: (e: React.MouseEvent) => void;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = rowRef.current;
    if (!el || editing) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); onDelete(); }
      else if (e.key === "Enter") { e.preventDefault(); onStartEdit(); }
    }
    el.addEventListener("keydown", handleKeyDown);
    return () => el.removeEventListener("keydown", handleKeyDown);
  }, [editing, onDelete, onStartEdit]);
  return (
    <div ref={rowRef} tabIndex={0} className="group flex items-center gap-3 rounded-md px-3 py-2 hover:bg-muted/50 outline-none focus-visible:ring-1 focus-visible:ring-ring" onContextMenu={onContextMenu}>
      <button type="button" onClick={onToggle} tabIndex={-1} className="flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded border border-muted-foreground/30 hover:border-primary hover:bg-primary/10 transition-all duration-200" />
      {editing ? (
        <form className="flex-1" onSubmit={(e) => { e.preventDefault(); onEditSubmit(); }}>
          <Input value={editText} onChange={(e) => onEditChange(e.target.value)} className="h-7 text-sm" autoFocus onBlur={onEditSubmit} onKeyDown={(e) => e.key === "Escape" && onEditCancel()} />
        </form>
      ) : (<span className="flex-1 text-sm">{todo.text}</span>)}
      {carried && <span className="shrink-0 rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] text-destructive">{carried}</span>}
      {!editing && (<>
        <button type="button" tabIndex={-1} className="shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground" onClick={onStartEdit} aria-label="Edit todo"><Pencil className="h-3 w-3" /></button>
        <button type="button" tabIndex={-1} className="shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive" onClick={onDelete} aria-label="Delete todo"><Trash2 className="h-3 w-3" /></button>
      </>)}
    </div>
  );
});
