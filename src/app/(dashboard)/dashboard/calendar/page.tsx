"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, addMonths, subMonths, isSameMonth, isToday,
} from "date-fns";
import { useBusinessStore } from "@/hooks/use-business";
import { fetchCurrentUser, fetchProfile, fetchCalendarEvents, userKeys, calendarKeys } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import {
  ChevronLeft, ChevronRight, Plus, X, CalendarDays,
  Clock, Check, Trash2, ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

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
const GRID_W = CELL_W * 7; // 630px

// ─── Page ───────────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const currentBusiness = useBusinessStore((s) => s.currentBusiness);
  const businessId = currentBusiness?.id;
  const queryClient = useQueryClient();
  const supabase = createClient();
  const router = useRouter();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickTitle, setQuickTitle] = useState("");
  const [quickTime, setQuickTime] = useState("");
  const [quickType, setQuickType] = useState<"todo" | "google">("todo");
  const [monthAnimating, setMonthAnimating] = useState(false);
  const [animDir, setAnimDir] = useState<"left" | "right">("right");

  // Selection
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [lastDeleted, setLastDeleted] = useState<CalendarEvent | null>(null);

  // Context menus
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; date: string } | null>(null);

  // Clear selection on date change
  useEffect(() => { setSelected(new Set()); }, [selectedDate]);

  // Escape/scroll closes menus
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setCtxMenu(null); }
    function onScroll() { setCtxMenu(null); }
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("scroll", onScroll, true); };
  }, []);

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

  const allEvents: CalendarEvent[] = [
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
  ];

  const eventsByDate = new Map<string, CalendarEvent[]>();
  for (const ev of allEvents) {
    if (ev.endDate && ev.endDate > ev.startDate) {
      let d2 = new Date(ev.startDate); const end2 = new Date(ev.endDate);
      while (d2 <= end2) { const key = format(d2, "yyyy-MM-dd"); if (!eventsByDate.has(key)) eventsByDate.set(key, []); eventsByDate.get(key)!.push(ev); d2 = addDays(d2, 1); }
    } else {
      const key = ev.startDate; if (!eventsByDate.has(key)) eventsByDate.set(key, []); eventsByDate.get(key)!.push(ev);
    }
  }

  const multiDayEvents = allEvents.filter((e) => e.endDate && e.endDate > e.startDate);
  function getEvents(dateStr: string) { return eventsByDate.get(dateStr) ?? []; }

  const dayEvents = selectedDate
    ? getEvents(selectedDate).sort((a, b) => {
        if (a.time && !b.time) return -1; if (!a.time && b.time) return 1;
        if (a.time && b.time) return a.time.localeCompare(b.time); return 0;
      })
    : [];

  const calStart = startOfWeek(startOfMonth(currentMonth));
  const calEnd = endOfWeek(endOfMonth(currentMonth));
  const days: Date[] = [];
  { let d = calStart; while (d <= calEnd) { days.push(d); d = addDays(d, 1); } }

  const panelOpen = !!selectedDate;

  // ─── Handlers ─────────────────────────────────────────────────────────────

  function toggleDate(dateStr: string) { setSelectedDate(selectedDate === dateStr ? null : dateStr); setShowQuickAdd(false); }

  function goNextMonth() { setAnimDir("right"); setMonthAnimating(true); setTimeout(() => { setCurrentMonth(addMonths(currentMonth, 1)); setMonthAnimating(false); }, 150); }
  function goPrevMonth() { setAnimDir("left"); setMonthAnimating(true); setTimeout(() => { setCurrentMonth(subMonths(currentMonth, 1)); setMonthAnimating(false); }, 150); }
  function goToday() { setAnimDir("right"); setMonthAnimating(true); setTimeout(() => { setCurrentMonth(new Date()); setSelectedDate(format(new Date(), "yyyy-MM-dd")); setMonthAnimating(false); }, 150); }

  function invalidateCal() { queryClient.invalidateQueries({ queryKey: ["calendar"] }); queryClient.invalidateQueries({ queryKey: ["google-calendar"] }); }

  async function handleQuickAdd() {
    if (!quickTitle.trim() || !selectedDate) return;
    if (quickType === "todo") {
      const { error } = await supabase.from("todos").insert({ user_id: userId, text: quickTitle.trim(), due_date: selectedDate, completed: false });
      if (error) { toast.error("Failed to create todo"); return; }
      toast.success("Todo created");
    } else {
      if (!googleConnected) { toast.error("Connect Google Calendar in Settings first"); return; }
      const start = quickTime ? { dateTime: `${selectedDate}T${quickTime}:00` } : { date: selectedDate };
      const end = quickTime ? { dateTime: `${selectedDate}T${addHour(quickTime)}:00` } : { date: format(addDays(new Date(selectedDate), 1), "yyyy-MM-dd") };
      const res = await fetch("/api/calendar/google", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ summary: quickTitle.trim(), start, end }) });
      if (!res.ok) { toast.error("Failed to create event"); return; }
      toast.success("Event created");
    }
    setQuickTitle(""); setQuickTime(""); setShowQuickAdd(false); invalidateCal();
  }

  // Event actions
  async function handleCompleteTodo(id: string, completed: boolean) {
    await supabase.from("todos").update({ completed }).eq("id", id);
    toast.success(completed ? "Completed" : "Reopened");
    invalidateCal();
  }

  const handleDeleteEvent = useCallback(async (ev: CalendarEvent) => {
    setLastDeleted(ev);
    if (ev.type === "todo") await supabase.from("todos").delete().eq("id", ev.id);
    toast.success("Deleted", {
      action: {
        label: "Undo",
        onClick: async () => {
          if (ev.type === "todo") {
            await supabase.from("todos").insert({ text: ev.title, due_date: ev.startDate, user_id: userId, completed: false });
            toast.success("Restored");
            invalidateCal();
          }
        },
      },
    });
    invalidateCal();
  }, [supabase, userId]);

  // Bulk actions
  async function handleBulkComplete() {
    const ids = [...selected].filter((id) => dayEvents.find((e) => e.id === id && e.type === "todo"));
    if (ids.length === 0) return;
    await supabase.from("todos").update({ completed: true }).in("id", ids);
    toast.success(`${ids.length} completed`);
    setSelected(new Set()); invalidateCal();
  }

  async function handleBulkDelete() {
    const ids = [...selected].filter((id) => dayEvents.find((e) => e.id === id && e.type === "todo"));
    if (ids.length === 0) return;
    await supabase.from("todos").delete().in("id", ids);
    toast.success(`${ids.length} deleted`);
    setSelected(new Set()); invalidateCal();
  }

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.key === "Delete" || e.key === "Backspace") && selected.size > 0 && !(e.target as HTMLElement).closest("input,textarea")) {
        e.preventDefault(); handleBulkDelete();
      }
      if (e.key === "Escape") {
        if (selected.size > 0) setSelected(new Set());
        else if (showQuickAdd) setShowQuickAdd(false);
        else if (selectedDate) { setSelectedDate(null); setShowQuickAdd(false); }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "a" && selectedDate && !(e.target as HTMLElement).closest("input,textarea")) {
        e.preventDefault(); setSelected(new Set(dayEvents.map((e) => e.id)));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function toggleSelect(id: string, shift: boolean) {
    if (shift) {
      setSelected((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
    } else {
      setSelected(new Set([id]));
    }
  }

  // ─── Quick Add Form ───────────────────────────────────────────────────────

  function QuickAddForm() {
    if (!showQuickAdd) return null;
    return (
      <div className="animate-center-scale-in mb-4 rounded-xl border border-border/70 p-4 space-y-3 bg-card">
        <Input placeholder="Add event or todo..." autoFocus value={quickTitle}
          onChange={(e) => setQuickTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && quickTitle.trim()) handleQuickAdd(); if (e.key === "Escape") setShowQuickAdd(false); }}
          className="h-9 text-sm rounded-lg" />
        <div className="flex gap-2">
          <Input type="time" value={quickTime} onChange={(e) => setQuickTime(e.target.value)} className="w-28 h-9 text-xs rounded-lg" />
          <Select value={quickType} onValueChange={(v) => setQuickType(v as "todo" | "google")}>
            <SelectTrigger className="flex-1 h-9 text-xs rounded-lg"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todo">Todo</SelectItem>
              {googleConnected && <SelectItem value="google">Event</SelectItem>}
            </SelectContent>
          </Select>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" className="h-7 text-xs rounded-lg" onClick={() => setShowQuickAdd(false)}>Cancel</Button>
          <Button size="sm" className="h-7 text-xs press-effect rounded-lg" onClick={handleQuickAdd} disabled={!quickTitle.trim()}>Add</Button>
        </div>
      </div>
    );
  }

  // ─── Side Panel Content ───────────────────────────────────────────────────

  function PanelContent() {
    if (!selectedDate) return null;
    const sd = new Date(selectedDate + "T00:00:00");
    return (
      <div className="animate-tab-enter">
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
        <QuickAddForm />

        {dayEvents.length === 0 && !showQuickAdd ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 mx-auto rounded-full bg-muted/30 flex items-center justify-center mb-3"><CalendarDays className="h-5 w-5 text-muted-foreground/40" /></div>
            <p className="text-sm text-muted-foreground">No events</p>
            <p className="text-xs text-muted-foreground mt-1">Click + to add one</p>
          </div>
        ) : (
          <div className="space-y-2">
            {dayEvents.map((ev, i) => (
              <div
                key={ev.id}
                onClick={(e) => toggleSelect(ev.id, e.shiftKey)}
                onContextMenu={(e) => { e.preventDefault(); setCtxMenu({ x: e.clientX, y: e.clientY, date: selectedDate }); }}
                className={cn(
                  "group flex items-start gap-3 rounded-xl border px-3.5 py-3 text-sm transition-all animate-stagger-in cursor-pointer",
                  "hover:bg-muted/40",
                  selected.has(ev.id) ? "bg-primary/[0.08] border-primary/30" : "border-border/70 hover:border-border",
                  (ev.completed || ev.status === "completed") && "opacity-35",
                )}
                style={{ animationDelay: `${i * 50}ms`, animationFillMode: "both" }}
              >
                <div className="w-[3px] self-stretch rounded-full shrink-0 mt-0.5" style={{ background: ev.color }} />
                <div className="flex-1 min-w-0">
                  <p className={cn("font-medium text-[13px] leading-snug", (ev.completed || ev.status === "completed") && "line-through")}>{ev.title}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {ev.time ? `${ev.time}${ev.endTime ? ` – ${ev.endTime}` : ""}` : "All day"}
                    {" · "}{ev.type === "google" ? "Google Calendar" : ev.type === "todo" ? "Todo" : "Checklist"}
                  </p>
                </div>
                {/* Action buttons — hover only */}
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  {ev.type === "todo" && (
                    <>
                      <button onClick={(e) => { e.stopPropagation(); handleCompleteTodo(ev.id, !ev.completed); }}
                        className="h-6 w-6 rounded-full flex items-center justify-center hover:bg-muted transition-colors" title={ev.completed ? "Reopen" : "Complete"}>
                        <Check className="h-3 w-3" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteEvent(ev); }}
                        className="h-6 w-6 rounded-full flex items-center justify-center hover:bg-destructive/10 hover:text-destructive transition-colors" title="Delete">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </>
                  )}
                  {ev.type === "checklist" && (
                    <button onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/checklists/${ev.id}`); }}
                      className="h-6 w-6 rounded-full flex items-center justify-center hover:bg-muted transition-colors" title="Open">
                      <ExternalLink className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Bulk action bar */}
        {selected.size > 1 && (
          <div className="sticky bottom-0 mt-4 p-3 bg-card border-t rounded-b-xl animate-slide-up">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{selected.size} selected</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="h-7 text-xs press-effect" onClick={handleBulkComplete}>
                  <Check className="h-3 w-3 mr-1" /> Complete
                </Button>
                <Button variant="outline" size="sm" className="h-7 text-xs text-destructive press-effect" onClick={handleBulkDelete}>
                  <Trash2 className="h-3 w-3 mr-1" /> Delete
                </Button>
              </div>
            </div>
          </div>
        )}

        {!googleConnected && (
          <div className="mt-8 rounded-2xl bg-muted/20 p-3.5 text-center animate-stagger-in" style={{ animationDelay: "400ms" }}>
            <p className="text-[11px] text-muted-foreground">Connect Google Calendar in <a href="/dashboard/settings" className="text-primary hover:underline">Settings</a> to sync events</p>
          </div>
        )}
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="-m-4 lg:-m-6 flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* ── Left: Calendar ── */}
      <div className={cn(
        "flex-1 flex items-start overflow-y-auto py-4 transition-all duration-[400ms]",
        panelOpen ? "justify-start pl-8" : "justify-center",
      )} style={{ transitionTimingFunction: EASE }}>
        <div>
          {/* Header */}
          <div style={{ width: GRID_W }} className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full press-effect active:translate-x-[-2px]" onClick={goPrevMonth}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-2xl font-bold min-w-[160px] text-center tracking-tight">{format(currentMonth, "MMMM yyyy")}</h1>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full press-effect active:translate-x-[2px]" onClick={goNextMonth}>
                <ChevronRight className="h-5 w-5" />
              </Button>
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
            {WEEKDAYS.map((w) => (
              <div key={w} className="py-2 text-center text-[11px] font-medium text-muted-foreground uppercase tracking-widest">{w}</div>
            ))}
          </div>

          {/* Grid — fixed cell size */}
          <div
            style={{ width: GRID_W }}
            className={cn(
              "grid grid-cols-7 rounded-xl border border-border/70 overflow-hidden transition-all duration-200",
              monthAnimating && animDir === "right" && "opacity-0 -translate-x-3",
              monthAnimating && animDir === "left" && "opacity-0 translate-x-3",
              !monthAnimating && "opacity-100 translate-x-0",
            )}
          >
            {days.map((day) => {
              const dateStr = format(day, "yyyy-MM-dd");
              const dayEvs = getEvents(dateStr);
              const singleDay = dayEvs.filter((e) => !e.endDate || e.endDate === e.startDate);
              const inMonth = isSameMonth(day, currentMonth);
              const today = isToday(day);
              const isSelected = selectedDate === dateStr;

              const dots = singleDay.slice(0, 5).map((e) => e.color);
              const overflow = singleDay.length > 5 ? singleDay.length - 5 : 0;
              const bars = multiDayEvents.filter((e) => { const s = new Date(e.startDate); const end = new Date(e.endDate!); return day >= s && day <= end; });

              return (
                <button
                  key={dateStr}
                  type="button"
                  style={{ width: CELL_W, height: CELL_H }}
                  className={cn(
                    "relative flex flex-col p-1.5 text-left border-b border-r border-border/70 transition-all duration-200 group active:scale-[0.97]",
                    inMonth ? "bg-card" : "bg-card opacity-50",
                    isSelected && "bg-primary/[0.08]",
                    !isSelected && inMonth && "hover:bg-muted/40",
                  )}
                  onClick={() => toggleDate(dateStr)}
                  onContextMenu={(e) => { e.preventDefault(); setCtxMenu({ x: e.clientX, y: e.clientY, date: dateStr }); }}
                >
                  <div className="flex items-center justify-between">
                    <span className={cn(
                      "text-xs inline-flex items-center justify-center",
                      today && "bg-primary text-primary-foreground w-6 h-6 rounded-full font-semibold text-[10px]",
                      !today && inMonth && "font-medium text-foreground/80",
                      !inMonth && "text-muted-foreground",
                    )}>
                      {format(day, "d")}
                    </span>
                    <span className="opacity-0 group-hover:opacity-60 transition-opacity">
                      <Plus className="h-3 w-3 text-muted-foreground" />
                    </span>
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

      {/* ── Right: Side panel (desktop) ── */}
      <div
        className={cn("hidden lg:block flex-shrink-0 bg-card overflow-y-auto scroll-smooth", panelOpen && "border-l")}
        style={{ width: panelOpen ? 340 : 0, opacity: panelOpen ? 1 : 0, transition: `all 400ms ${EASE}` }}
      >
        <div className="p-5 min-w-[340px]">
          <PanelContent />
        </div>
      </div>

      {/* ── Mobile: bottom sheet ── */}
      {selectedDate && (
        <div className="lg:hidden fixed inset-x-0 bottom-0 z-40 max-h-[60vh] overflow-y-auto scroll-smooth rounded-t-2xl border-t bg-card shadow-lg animate-slide-up p-5">
          <PanelContent />
        </div>
      )}

      {/* ── Context menu ── */}
      {ctxMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setCtxMenu(null)} />
          <div className="fixed z-50 w-48 rounded-xl border border-border/70 bg-card shadow-lg p-1 animate-center-scale-in"
            style={{ left: Math.min(ctxMenu.x, typeof window !== "undefined" ? window.innerWidth - 210 : 999), top: Math.min(ctxMenu.y, typeof window !== "undefined" ? window.innerHeight - 160 : 999) }}>
            <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-muted/50 transition-colors"
              onClick={() => { setSelectedDate(ctxMenu.date); setShowQuickAdd(true); setCtxMenu(null); }}>
              <Plus className="h-3.5 w-3.5" /> Add event
            </button>
            <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-muted/50 transition-colors"
              onClick={() => { setSelectedDate(ctxMenu.date); setCtxMenu(null); }}>
              <CalendarDays className="h-3.5 w-3.5" /> View day
            </button>
            <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-muted/50 transition-colors"
              onClick={() => { goToday(); setCtxMenu(null); }}>
              <Clock className="h-3.5 w-3.5" /> Go to today
            </button>
            {panelOpen && (
              <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-muted/50 transition-colors"
                onClick={() => { setSelectedDate(null); setShowQuickAdd(false); setCtxMenu(null); }}>
                <X className="h-3.5 w-3.5" /> Close panel
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function addHour(time: string): string {
  const [h, m] = time.split(":").map(Number);
  return `${String((h + 1) % 24).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
