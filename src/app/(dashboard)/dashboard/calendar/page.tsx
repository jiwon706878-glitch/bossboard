"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, addMonths, subMonths, isSameMonth, isToday,
} from "date-fns";
import { useBusinessStore } from "@/hooks/use-business";
import { fetchCurrentUser, fetchProfile, fetchCalendarEvents, userKeys, calendarKeys } from "@/lib/queries";
import { pushUndo } from "@/components/dashboard/global-shortcuts";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import {
  ChevronLeft, ChevronRight, Plus, X, CalendarDays, Check, Trash2, Clock,
} from "lucide-react";
import { toast } from "sonner";

// ─── Types ──────────────────────────────────────────────────────────────────

interface CalendarEvent {
  id: string;
  title: string;
  startDate: string;
  endDate?: string;
  time?: string;
  endTime?: string;
  type: "google" | "todo" | "checklist";
  color: string;
  completed?: boolean;
  status?: string;
}

interface GoogleApiEvent {
  id: string;
  summary: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const COLORS = { google: "#378ADD", todo: "#1D9E75", checklist: "#EF9F27" } as const;
const EASE = "cubic-bezier(0.16,1,0.3,1)";
const CELL_W = 90;
const CELL_H = 72;
const GRID_W = CELL_W * 7;

// ─── Page ───────────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const currentBusiness = useBusinessStore((s) => s.currentBusiness);
  const businessId = currentBusiness?.id;
  const queryClient = useQueryClient();
  const supabase = createClient();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickTitle, setQuickTitle] = useState("");
  const [quickTime, setQuickTime] = useState("");
  const [monthAnimating, setMonthAnimating] = useState(false);
  const [animDir, setAnimDir] = useState<"left" | "right">("right");

  // Selection
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [anchor, setAnchor] = useState<string | null>(null);

  // Drag
  const [draggedEvent, setDraggedEvent] = useState<CalendarEvent | null>(null);
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);

  // Context menu
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; date: string } | null>(null);

  // Panel animation control — only animate on date change, not every re-render
  const panelFirstRender = useRef(true);
  useEffect(() => {
    if (selectedDate) { panelFirstRender.current = true; requestAnimationFrame(() => { panelFirstRender.current = false; }); }
  }, [selectedDate]);

  // IME composition state for Korean input
  const [isComposing, setIsComposing] = useState(false);

  // Clear selection on date change
  useEffect(() => { setSelected(new Set()); setAnchor(null); }, [selectedDate]);

  // Close context menus on Escape, scroll, or click outside
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setCtxMenu(null); }
    function onScroll() { setCtxMenu(null); }
    function onMouseDown(e: MouseEvent) {
      // Close context menu if clicking outside it
      const target = e.target as HTMLElement;
      if (ctxMenu && !target.closest("[data-ctx-menu]")) setCtxMenu(null);
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    document.addEventListener("mousedown", onMouseDown);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("scroll", onScroll, true); document.removeEventListener("mousedown", onMouseDown); };
  }, [ctxMenu]);

  // Drag position tracking — use document dragover for reliable coords
  useEffect(() => {
    if (!draggedEvent) return;
    function handleDragOver(e: DragEvent) {
      e.preventDefault();
      setDragPos({ x: e.clientX, y: e.clientY });
    }
    document.addEventListener("dragover", handleDragOver);
    return () => document.removeEventListener("dragover", handleDragOver);
  }, [draggedEvent]);

  // ─── Queries ──────────────────────────────────────────────────────────────

  const { data: user } = useQuery({ queryKey: userKeys.current, queryFn: fetchCurrentUser, retry: false });
  const userId = user?.id;
  const { data: profile } = useQuery({
    queryKey: userKeys.profile(userId ?? ""), queryFn: () => fetchProfile(userId!),
    enabled: !!userId, staleTime: 5 * 60 * 1000,
  });

  const googleConnected = !!profile?.google_calendar_tokens;
  const monthStr = format(currentMonth, "yyyy-MM");
  const mStart = format(startOfMonth(currentMonth), "yyyy-MM-dd");
  const mEnd = format(endOfMonth(currentMonth), "yyyy-MM-dd");

  const { data: localEvents = [] } = useQuery({
    queryKey: calendarKeys.events(businessId ?? "", monthStr),
    queryFn: () => fetchCalendarEvents(businessId!, userId!, mStart, mEnd),
    enabled: !!businessId && !!userId,
  });

  const googleQueryKey = ["google-calendar", monthStr];
  const { data: googleData } = useQuery({
    queryKey: googleQueryKey,
    queryFn: async () => {
      const res = await fetch(`/api/calendar/google?timeMin=${mStart}&timeMax=${mEnd}`);
      if (!res.ok) return { events: [], connected: false };
      return res.json();
    },
    enabled: googleConnected, staleTime: 2 * 60 * 1000,
  });

  // ─── Map events ───────────────────────────────────────────────────────────

  const allEvents = useMemo<CalendarEvent[]>(() => [
    ...localEvents.map((e) => ({
      id: e.id, title: e.title, startDate: e.date,
      type: e.type as "todo" | "checklist",
      color: e.type === "todo" ? COLORS.todo : COLORS.checklist,
      completed: e.completed, status: e.status,
    })),
    ...(googleData?.events ?? []).map((ge: GoogleApiEvent) => {
      const sd = ge.start.dateTime ? format(new Date(ge.start.dateTime), "yyyy-MM-dd") : ge.start.date ?? "";
      const adjustedEnd = !ge.start.dateTime && ge.end?.date
        ? format(addDays(new Date(ge.end.date), -1), "yyyy-MM-dd")
        : ge.end?.dateTime ? format(new Date(ge.end.dateTime), "yyyy-MM-dd") : sd;
      return {
        id: ge.id, title: ge.summary || "(No title)", startDate: sd,
        endDate: adjustedEnd !== sd ? adjustedEnd : undefined,
        time: ge.start.dateTime ? format(new Date(ge.start.dateTime), "HH:mm") : undefined,
        endTime: ge.end?.dateTime ? format(new Date(ge.end.dateTime), "HH:mm") : undefined,
        type: "google" as const, color: COLORS.google,
      };
    }),
  ], [localEvents, googleData?.events]);

  const { eventsByDate, multiDayEvents } = useMemo(() => {
    const byDate = new Map<string, CalendarEvent[]>();
    for (const ev of allEvents) {
      if (ev.endDate && ev.endDate > ev.startDate) {
        let d2 = new Date(ev.startDate); const end2 = new Date(ev.endDate);
        while (d2 <= end2) { const key = format(d2, "yyyy-MM-dd"); if (!byDate.has(key)) byDate.set(key, []); byDate.get(key)!.push(ev); d2 = addDays(d2, 1); }
      } else {
        const key = ev.startDate; if (!byDate.has(key)) byDate.set(key, []); byDate.get(key)!.push(ev);
      }
    }
    return { eventsByDate: byDate, multiDayEvents: allEvents.filter((e) => e.endDate && e.endDate > e.startDate) };
  }, [allEvents]);

  const getEvents = useCallback((dateStr: string) => eventsByDate.get(dateStr) ?? [], [eventsByDate]);

  const dayEvents = useMemo(() => selectedDate
    ? getEvents(selectedDate).sort((a, b) => {
        if (a.time && !b.time) return -1; if (!a.time && b.time) return 1;
        if (a.time && b.time) return a.time.localeCompare(b.time); return 0;
      })
    : [], [selectedDate, getEvents]);

  const days = useMemo(() => {
    const calStart = startOfWeek(startOfMonth(currentMonth));
    const calEnd = endOfWeek(endOfMonth(currentMonth));
    const result: Date[] = [];
    let d = calStart; while (d <= calEnd) { result.push(d); d = addDays(d, 1); }
    return result;
  }, [currentMonth]);

  const panelOpen = !!selectedDate;

  // ─── Handlers ─────────────────────────────────────────────────────────────

  function toggleDate(dateStr: string) { setSelectedDate(selectedDate === dateStr ? null : dateStr); setShowQuickAdd(false); }
  function goNextMonth() { setSelectedDate(null); setSelected(new Set()); setCtxMenu(null); setAnimDir("right"); setMonthAnimating(true); setTimeout(() => { setCurrentMonth(addMonths(currentMonth, 1)); setMonthAnimating(false); }, 150); }
  function goPrevMonth() { setSelectedDate(null); setSelected(new Set()); setCtxMenu(null); setAnimDir("left"); setMonthAnimating(true); setTimeout(() => { setCurrentMonth(subMonths(currentMonth, 1)); setMonthAnimating(false); }, 150); }
  function goToday() { setAnimDir("right"); setMonthAnimating(true); setTimeout(() => { setCurrentMonth(new Date()); setSelectedDate(format(new Date(), "yyyy-MM-dd")); setMonthAnimating(false); }, 150); }

  function invalidateCal() { queryClient.invalidateQueries({ queryKey: ["calendar"] }); queryClient.invalidateQueries({ queryKey: ["google-calendar"] }); }

  const quickAddRef = useRef<HTMLInputElement>(null);

  async function handleQuickAdd(titleOverride?: string) {
    const title = titleOverride || quickTitle;
    if (!title.trim() || !selectedDate || !userId) return;
    const { error } = await supabase.from("todos").insert({ user_id: userId, text: title.trim(), due_date: selectedDate, completed: false });
    if (error) { toast.error("Failed to create todo"); return; }
    toast.success("Todo added");
    setQuickTitle(""); setQuickTime(""); setShowQuickAdd(false);
    if (quickAddRef.current) quickAddRef.current.value = "";
    invalidateCal();
  }

  async function handleCompleteTodo(id: string, completed: boolean) {
    pushUndo({ type: "todo_complete", data: { id, previousState: !completed } });
    await supabase.from("todos").update({ completed }).eq("id", id);
    toast.success(completed ? "Completed" : "Reopened");
    invalidateCal();
  }

  async function handleDeleteEvent(ev: CalendarEvent) {
    if (ev.type !== "todo") return;
    const { data } = await supabase.from("todos").select("*").eq("id", ev.id).single();
    if (data) pushUndo({ type: "todo_delete", data });
    await supabase.from("todos").delete().eq("id", ev.id);
    toast.success("Deleted");
    invalidateCal();
  }

  async function handleBulkDelete() {
    const ids = [...selected].filter((id) => dayEvents.find((e) => e.id === id && e.type === "todo"));
    if (ids.length === 0) return;
    const { data } = await supabase.from("todos").select("*").in("id", ids);
    if (data) pushUndo({ type: "bulk_delete", data });
    await supabase.from("todos").delete().in("id", ids);
    toast.success(`${ids.length} deleted`);
    setSelected(new Set()); invalidateCal();
  }

  async function handleBulkComplete() {
    const ids = [...selected].filter((id) => dayEvents.find((e) => e.id === id && e.type === "todo"));
    if (ids.length === 0) return;
    await supabase.from("todos").update({ completed: true }).in("id", ids);
    toast.success(`${ids.length} completed`);
    setSelected(new Set()); invalidateCal();
  }

  // Selection
  function handleEventClick(e: React.MouseEvent, ev: CalendarEvent, index: number) {
    if (e.shiftKey && anchor !== null) {
      const anchorIdx = dayEvents.findIndex((de) => de.id === anchor);
      if (anchorIdx !== -1) {
        const start = Math.min(anchorIdx, index);
        const end = Math.max(anchorIdx, index);
        setSelected(new Set(dayEvents.slice(start, end + 1).map((de) => de.id)));
      }
    } else if (e.ctrlKey || e.metaKey) {
      setSelected((prev) => { const next = new Set(prev); if (next.has(ev.id)) next.delete(ev.id); else next.add(ev.id); return next; });
      setAnchor(ev.id);
    } else {
      setSelected(new Set([ev.id]));
      setAnchor(ev.id);
    }
  }

  // Drag
  function handleDragStart(e: React.DragEvent, ev: CalendarEvent) {
    if (ev.type === "checklist") { e.preventDefault(); return; }
    const emptyImg = new Image();
    emptyImg.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=";
    e.dataTransfer.setDragImage(emptyImg, 0, 0);
    e.dataTransfer.setData("text/plain", JSON.stringify({ eventId: ev.id, eventType: ev.type, originalDate: ev.startDate }));
    setDraggedEvent(ev);
  }

  async function handleEventDrop(e: React.DragEvent, targetDate: string) {
    e.preventDefault(); setDragOverDate(null); setDraggedEvent(null);
    try {
      const data = JSON.parse(e.dataTransfer.getData("text/plain"));
      if (data.originalDate === targetDate) return;
      if (data.eventType === "todo") { await supabase.from("todos").update({ due_date: targetDate }).eq("id", data.eventId); toast.success("Todo moved"); }
      else if (data.eventType === "google") {
        const res = await fetch("/api/calendar/google", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventId: data.eventId, date: targetDate }) });
        if (!res.ok) throw new Error();
        toast.success("Event moved");
      }
      invalidateCal();
    } catch { toast.error("Failed to move event"); }
  }

  // Global shortcut listeners — use refs to avoid re-attaching on every render
  const selectedRef = useRef(selected);
  const dayEventsRef = useRef(dayEvents);
  const selectedDateRef = useRef(selectedDate);
  const showQuickAddRef = useRef(showQuickAdd);
  const handleBulkDeleteRef = useRef(handleBulkDelete);
  selectedRef.current = selected;
  dayEventsRef.current = dayEvents;
  selectedDateRef.current = selectedDate;
  showQuickAddRef.current = showQuickAdd;
  handleBulkDeleteRef.current = handleBulkDelete;

  useEffect(() => {
    function onUndo(e: Event) {
      const entry = (e as CustomEvent).detail;
      if (entry.type === "todo_delete" && entry.data) {
        const { id: _id, ...rest } = entry.data;
        supabase.from("todos").insert(rest).then(() => { invalidateCal(); toast.success("Restored"); });
      } else if (entry.type === "bulk_delete" && entry.data) {
        const cleaned = entry.data.map((d: Record<string, unknown>) => { const { id: _id, ...rest } = d; return rest; });
        supabase.from("todos").insert(cleaned).then(() => { invalidateCal(); toast.success(`${cleaned.length} restored`); });
      } else if (entry.type === "todo_complete" && entry.data) {
        supabase.from("todos").update({ completed: entry.data.previousState }).eq("id", entry.data.id).then(() => invalidateCal());
      }
    }
    function onDelete() { if (selectedRef.current.size > 0) handleBulkDeleteRef.current(); }
    function onSelectAll() { if (selectedDateRef.current) setSelected(new Set(dayEventsRef.current.filter((e) => e.type === "todo").map((e) => e.id))); }
    function onEscape() {
      if (selectedRef.current.size > 0) setSelected(new Set());
      else if (showQuickAddRef.current) setShowQuickAdd(false);
      else if (selectedDateRef.current) setSelectedDate(null);
    }

    window.addEventListener("bossboard-undo", onUndo);
    window.addEventListener("bossboard-delete", onDelete);
    window.addEventListener("bossboard-select-all", onSelectAll);
    window.addEventListener("bossboard-escape", onEscape);
    return () => {
      window.removeEventListener("bossboard-undo", onUndo);
      window.removeEventListener("bossboard-delete", onDelete);
      window.removeEventListener("bossboard-select-all", onSelectAll);
      window.removeEventListener("bossboard-escape", onEscape);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Quick Add Form (inlined to avoid remount on re-render) ────────────────

  // ─── Panel Content (as JSX variable to avoid remount on re-render) ─────────

  const sd = selectedDate ? new Date(selectedDate + "T00:00:00") : null;
  const isFirstRender = panelFirstRender.current;
  const panelContent = selectedDate && sd ? (
    <div className={isFirstRender ? "animate-tab-enter" : ""}>
      <div className="flex items-center justify-between mb-6"
        onContextMenu={(e) => { e.preventDefault(); setCtxMenu({ x: e.clientX, y: e.clientY, date: selectedDate }); }}>
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{format(sd, "EEEE")}</p>
          <p className="text-4xl font-bold tracking-tight text-foreground mt-1">{format(sd, "d")}</p>
          <p className="text-sm text-muted-foreground mt-0.5">{format(sd, "MMMM yyyy")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8 rounded-full press-effect" onClick={() => setShowQuickAdd(!showQuickAdd)}><Plus className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full press-effect" onClick={() => { setSelectedDate(null); setShowQuickAdd(false); }}><X className="h-4 w-4" /></Button>
        </div>
      </div>
      <div className="h-px bg-border/70 mb-4" />
      {showQuickAdd && (
        <div onClick={(e) => e.stopPropagation()} className="animate-center-scale-in mb-4 rounded-xl border border-border/70 p-3 space-y-2 bg-card">
          <input
            ref={quickAddRef}
            type="text"
            className="flex h-9 w-full rounded-lg border border-border/70 bg-transparent px-3 py-1 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            placeholder="Add todo..."
            autoFocus
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={(e) => { setIsComposing(false); setQuickTitle((e.target as HTMLInputElement).value); }}
            onChange={(e) => { if (!isComposing) setQuickTitle(e.target.value); }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !isComposing) {
                const val = (e.target as HTMLInputElement).value.trim();
                if (val) handleQuickAdd(val);
              }
              if (e.key === "Escape") setShowQuickAdd(false);
            }}
          />
          <div className="flex items-center justify-between">
            <input
              type="text"
              className="flex h-8 w-28 rounded-lg border border-border/70 bg-transparent px-3 py-1 text-xs outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              placeholder="14:00"
              value={quickTime}
              onChange={(e) => setQuickTime(e.target.value)}
            />
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowQuickAdd(false)}>Cancel</Button>
              <Button size="sm" className="h-7 text-xs press-effect" onClick={() => handleQuickAdd()}>Add</Button>
            </div>
          </div>
        </div>
      )}

      {dayEvents.length === 0 && !showQuickAdd ? (
        <div className="text-center py-12">
          <div className="w-12 h-12 mx-auto rounded-full bg-muted/30 flex items-center justify-center mb-3"><CalendarDays className="h-5 w-5 text-muted-foreground/40" /></div>
          <p className="text-sm text-muted-foreground">No events</p>
          <p className="text-xs text-muted-foreground mt-1">Click + to add one</p>
        </div>
      ) : (
        <div className="space-y-2 stagger-children">
          {dayEvents.map((ev, i) => (
            <div
              key={ev.id}
              draggable={ev.type !== "checklist"}
              onDragStart={(e) => handleDragStart(e, ev)}
              onDragEnd={() => setDraggedEvent(null)}
              onClick={(e) => { e.stopPropagation(); handleEventClick(e, ev, i); }}
              className={cn(
                "group flex items-start gap-3 rounded-xl border px-3.5 py-3 text-sm transition-all",
                ev.type !== "checklist" ? "cursor-grab active:cursor-grabbing" : "cursor-default",
                selected.has(ev.id) ? "bg-primary/[0.08] border-primary/30 hover:bg-primary/[0.12]" : "border-border/70 hover:bg-muted/30 hover:border-border",
                (ev.completed || ev.status === "completed") && "opacity-35",
                draggedEvent?.id === ev.id && "opacity-30 pointer-events-none",
              )}
            >
              <div className="w-[3px] self-stretch rounded-full shrink-0 mt-0.5" style={{ background: ev.color }} />
              <div className="flex-1 min-w-0">
                <p className={cn("font-medium text-[13px] leading-snug", (ev.completed || ev.status === "completed") && "line-through")}>{ev.title}</p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {ev.time ? `${ev.time}${ev.endTime ? ` – ${ev.endTime}` : ""}` : "All day"}
                  {" · "}{ev.type === "google" ? "Google Calendar" : ev.type === "todo" ? "Todo" : "Checklist"}
                </p>
              </div>
              {ev.type === "todo" && (
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button onClick={(e) => { e.stopPropagation(); handleCompleteTodo(ev.id, !ev.completed); }}
                    className={cn("h-6 w-6 rounded-full flex items-center justify-center transition-colors", ev.completed ? "bg-primary/20 text-primary" : "hover:bg-muted")}
                    title={ev.completed ? "Mark incomplete" : "Mark complete"}>
                    <Check className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {selected.size > 1 && (
        <div className="sticky bottom-0 mt-4 p-3 bg-card border-t rounded-b-xl">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{selected.size} selected</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="h-7 text-xs press-effect" onClick={handleBulkComplete}><Check className="h-3 w-3 mr-1" /> Complete</Button>
              <Button variant="outline" size="sm" className="h-7 text-xs text-destructive press-effect" onClick={handleBulkDelete}><Trash2 className="h-3 w-3 mr-1" /> Delete</Button>
            </div>
          </div>
        </div>
      )}

      {!googleConnected && (
        <div className="mt-8 rounded-2xl bg-muted/20 p-3.5 text-center">
          <p className="text-[11px] text-muted-foreground">Connect Google Calendar in <a href="/dashboard/settings" className="text-primary hover:underline">Settings</a> to sync events</p>
        </div>
      )}
    </div>
  ) : null;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="-m-4 lg:-m-6 flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* ── Left: Calendar ── */}
      <div className="flex-1 flex overflow-y-auto py-4">
        <div
          className="transition-all duration-[400ms]"
          style={{ width: GRID_W, flexShrink: 0, marginLeft: panelOpen ? "32px" : "auto", marginRight: "auto", transitionTimingFunction: EASE }}
        >
          {/* Header */}
          <div style={{ width: GRID_W }} className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full press-effect active:translate-x-[-2px]" onClick={goPrevMonth}><ChevronLeft className="h-5 w-5" /></Button>
              <h1 className="text-2xl font-bold min-w-[160px] text-center tracking-tight">{format(currentMonth, "MMMM yyyy")}</h1>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full press-effect active:translate-x-[2px]" onClick={goNextMonth}><ChevronRight className="h-5 w-5" /></Button>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-4 text-xs text-muted-foreground">
                {googleConnected && <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS.google }} />Events</span>}
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS.todo }} />Todos</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS.checklist }} />Checklists</span>
              </div>
              <Button variant="outline" size="sm" className="h-8 text-xs font-medium press-effect rounded-lg" onClick={goToday}>Today</Button>
            </div>
          </div>

          {/* Weekday headers */}
          <div style={{ width: GRID_W }} className="grid grid-cols-7 mb-1 border-b border-border/70">
            {WEEKDAYS.map((w) => <div key={w} className="py-2 text-center text-[11px] font-medium text-muted-foreground uppercase tracking-widest">{w}</div>)}
          </div>

          {/* Grid */}
          <div style={{ width: GRID_W }} className={cn(
            "grid grid-cols-7 rounded-xl border border-border/70 overflow-hidden transition-all duration-200",
            monthAnimating && animDir === "right" && "opacity-0 -translate-x-3",
            monthAnimating && animDir === "left" && "opacity-0 translate-x-3",
            !monthAnimating && "opacity-100 translate-x-0",
          )}>
            {days.map((day) => {
              const dateStr = format(day, "yyyy-MM-dd");
              const dayEvs = getEvents(dateStr);
              const singleDay = dayEvs.filter((e) => !e.endDate || e.endDate === e.startDate);
              const inMonth = isSameMonth(day, currentMonth);
              const today = isToday(day);
              const isSelected = selectedDate === dateStr;
              const isDragOver = dragOverDate === dateStr;
              const dots = singleDay.slice(0, 5).map((e) => e.color);
              const overflow = singleDay.length > 5 ? singleDay.length - 5 : 0;
              const bars = multiDayEvents.filter((e) => { const s = new Date(e.startDate); const end = new Date(e.endDate!); return day >= s && day <= end; });

              return (
                <button key={dateStr} type="button" style={{ width: CELL_W, height: CELL_H }}
                  className={cn(
                    "relative flex flex-col p-1.5 text-left border-b border-r border-border/70 transition-all duration-200 group active:scale-[0.97]",
                    inMonth ? "bg-card" : "bg-card opacity-50",
                    isSelected && "bg-primary/[0.08]",
                    !isSelected && inMonth && "hover:bg-muted/40",
                    isDragOver && "bg-primary/[0.12]",
                  )}
                  onClick={() => toggleDate(dateStr)}
                  onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setCtxMenu({ x: e.clientX, y: e.clientY, date: dateStr }); }}
                  onDragOver={(e) => { e.preventDefault(); setDragOverDate(dateStr); }}
                  onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverDate(null); }}
                  onDrop={(e) => handleEventDrop(e, dateStr)}
                >
                  <div className="flex items-center justify-between">
                    <span className={cn(
                      "text-xs inline-flex items-center justify-center",
                      today && "bg-primary text-primary-foreground w-6 h-6 rounded-full font-semibold text-[10px]",
                      !today && inMonth && "font-medium text-foreground/80",
                      !inMonth && "text-muted-foreground",
                    )}>{format(day, "d")}</span>
                    <span className="opacity-0 group-hover:opacity-60 transition-opacity"><Plus className="h-3 w-3 text-muted-foreground" /></span>
                  </div>
                  {dots.length > 0 && (
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {dots.map((c, i) => <span key={i} className="w-[6px] h-[6px] rounded-full" style={{ background: c }} />)}
                      {overflow > 0 && <span className="text-[8px] text-muted-foreground">+{overflow}</span>}
                    </div>
                  )}
                  {bars.length > 0 && (
                    <div className="absolute bottom-0.5 left-0.5 right-0.5 space-y-[2px]">
                      {bars.slice(0, 2).map((ev) => {
                        const isFirst = dateStr === ev.startDate; const isLast = dateStr === ev.endDate;
                        return <div key={ev.id} className={cn("h-[3px]", isFirst && "rounded-l-full", isLast && "rounded-r-full", !isFirst && "ml-[-1px]", !isLast && "mr-[-1px]")} style={{ background: ev.color }} title={ev.title} />;
                      })}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Right: Side panel ── */}
      <div className={cn("hidden lg:block flex-shrink-0 bg-card overflow-y-auto scroll-smooth", panelOpen && "border-l")}
        style={{ width: panelOpen ? 340 : 0, opacity: panelOpen ? 1 : 0, transition: `all 400ms ${EASE}` }}>
        <div className="p-5 min-w-[340px]">{panelContent}</div>
      </div>

      {/* ── Mobile: bottom sheet ── */}
      {selectedDate && (
        <div className="lg:hidden fixed inset-x-0 bottom-0 z-40 max-h-[60vh] overflow-y-auto scroll-smooth rounded-t-2xl border-t bg-card shadow-lg animate-slide-up p-5">
          {panelContent}
        </div>
      )}

      {/* ── Drag ghost ── */}
      {draggedEvent && (
        <div className="fixed z-[9999] pointer-events-none" style={{ left: dragPos.x - 80, top: dragPos.y - 16 }}>
          <div className="w-[160px] rounded-lg border bg-card shadow-lg px-3 py-2 text-xs font-medium flex items-center gap-2">
            <div className="w-[3px] h-4 rounded-full" style={{ background: draggedEvent.color }} />
            <span className="truncate">{draggedEvent.title}</span>
          </div>
        </div>
      )}

      {/* ── Context menu ── */}
      {ctxMenu && (
          <div data-ctx-menu className="fixed z-50 w-48 rounded-xl border border-border/70 bg-card shadow-lg p-1 animate-center-scale-in"
            style={{ left: Math.min(ctxMenu.x, typeof window !== "undefined" ? window.innerWidth - 210 : 999), top: Math.min(ctxMenu.y, typeof window !== "undefined" ? window.innerHeight - 160 : 999) }}>
            <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-muted/50 transition-colors"
              onClick={() => { setSelectedDate(ctxMenu.date); setShowQuickAdd(true); setCtxMenu(null); }}><Plus className="h-3.5 w-3.5" /> Add event</button>
            <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-muted/50 transition-colors"
              onClick={() => { setSelectedDate(ctxMenu.date); setCtxMenu(null); }}><CalendarDays className="h-3.5 w-3.5" /> View day</button>
            <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-muted/50 transition-colors"
              onClick={() => { goToday(); setCtxMenu(null); }}><Clock className="h-3.5 w-3.5" /> Go to today</button>
            {panelOpen && <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-muted/50 transition-colors"
              onClick={() => { setSelectedDate(null); setShowQuickAdd(false); setCtxMenu(null); }}><X className="h-3.5 w-3.5" /> Close panel</button>}
          </div>
      )}
    </div>
  );
}

