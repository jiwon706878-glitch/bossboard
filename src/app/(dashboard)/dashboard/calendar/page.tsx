"use client";

import { useState } from "react";
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
import { ChevronLeft, ChevronRight, Plus, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

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

// ─── Page ───────────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const currentBusiness = useBusinessStore((s) => s.currentBusiness);
  const businessId = currentBusiness?.id;
  const queryClient = useQueryClient();
  const supabase = createClient();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickTitle, setQuickTitle] = useState("");
  const [quickTime, setQuickTime] = useState("");
  const [quickType, setQuickType] = useState<"todo" | "google">("todo");

  // ─── Queries ──────────────────────────────────────────────────────────────

  const { data: user } = useQuery({ queryKey: userKeys.current, queryFn: fetchCurrentUser, retry: false });
  const userId = user?.id;

  const { data: profile } = useQuery({
    queryKey: userKeys.profile(userId ?? ""),
    queryFn: () => fetchProfile(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
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
    enabled: googleConnected,
    staleTime: 2 * 60 * 1000,
  });

  // ─── Map events ───────────────────────────────────────────────────────────

  const allEvents: CalendarEvent[] = [
    ...localEvents.map((e) => ({
      id: e.id,
      title: e.title,
      startDate: e.date,
      type: e.type as "todo" | "checklist",
      color: e.type === "todo" ? COLORS.todo : COLORS.checklist,
      completed: e.completed,
      status: e.status,
    })),
    ...(googleData?.events ?? []).map((ge: GoogleApiEvent) => {
      const sd = ge.start.dateTime ? format(new Date(ge.start.dateTime), "yyyy-MM-dd") : ge.start.date ?? "";
      const adjustedEnd = !ge.start.dateTime && ge.end?.date
        ? format(addDays(new Date(ge.end.date), -1), "yyyy-MM-dd")
        : ge.end?.dateTime ? format(new Date(ge.end.dateTime), "yyyy-MM-dd") : sd;
      return {
        id: ge.id,
        title: ge.summary || "(No title)",
        startDate: sd,
        endDate: adjustedEnd !== sd ? adjustedEnd : undefined,
        time: ge.start.dateTime ? format(new Date(ge.start.dateTime), "HH:mm") : undefined,
        endTime: ge.end?.dateTime ? format(new Date(ge.end.dateTime), "HH:mm") : undefined,
        type: "google" as const,
        color: COLORS.google,
      };
    }),
  ];

  // Group by date (expand multi-day)
  const eventsByDate = new Map<string, CalendarEvent[]>();
  for (const ev of allEvents) {
    if (ev.endDate && ev.endDate > ev.startDate) {
      let d2 = new Date(ev.startDate);
      const end2 = new Date(ev.endDate);
      while (d2 <= end2) {
        const key = format(d2, "yyyy-MM-dd");
        if (!eventsByDate.has(key)) eventsByDate.set(key, []);
        eventsByDate.get(key)!.push(ev);
        d2 = addDays(d2, 1);
      }
    } else {
      const key = ev.startDate;
      if (!eventsByDate.has(key)) eventsByDate.set(key, []);
      eventsByDate.get(key)!.push(ev);
    }
  }

  const multiDayEvents = allEvents.filter((e) => e.endDate && e.endDate > e.startDate);

  function getEvents(dateStr: string) { return eventsByDate.get(dateStr) ?? []; }

  const selectedEvents = selectedDate
    ? getEvents(selectedDate).sort((a, b) => {
        if (a.time && !b.time) return -1;
        if (!a.time && b.time) return 1;
        if (a.time && b.time) return a.time.localeCompare(b.time);
        return 0;
      })
    : [];

  // Grid days
  const calStart = startOfWeek(startOfMonth(currentMonth));
  const calEnd = endOfWeek(endOfMonth(currentMonth));
  const days: Date[] = [];
  { let d = calStart; while (d <= calEnd) { days.push(d); d = addDays(d, 1); } }

  // ─── Handlers ─────────────────────────────────────────────────────────────

  function goToday() {
    setCurrentMonth(new Date());
    setSelectedDate(format(new Date(), "yyyy-MM-dd"));
  }

  async function handleQuickAdd() {
    if (!quickTitle.trim() || !selectedDate) return;
    if (quickType === "todo") {
      const { error } = await supabase.from("todos").insert({
        user_id: userId, text: quickTitle.trim(), due_date: selectedDate, completed: false,
      });
      if (error) { toast.error("Failed to create todo"); return; }
      toast.success("Todo created");
      queryClient.invalidateQueries({ queryKey: ["calendar"] });
    } else {
      if (!googleConnected) { toast.error("Connect Google Calendar in Settings first"); return; }
      const start = quickTime ? { dateTime: `${selectedDate}T${quickTime}:00` } : { date: selectedDate };
      const end = quickTime
        ? { dateTime: `${selectedDate}T${addHour(quickTime)}:00` }
        : { date: format(addDays(new Date(selectedDate), 1), "yyyy-MM-dd") };
      const res = await fetch("/api/calendar/google", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summary: quickTitle.trim(), start, end }),
      });
      if (!res.ok) { toast.error("Failed to create event"); return; }
      toast.success("Event created");
      queryClient.invalidateQueries({ queryKey: googleQueryKey });
    }
    setQuickTitle(""); setQuickTime(""); setShowQuickAdd(false);
  }

  async function handleEventDrop(e: React.DragEvent, targetDate: string) {
    e.preventDefault();
    setDragOverDate(null);
    try {
      const data = JSON.parse(e.dataTransfer.getData("application/json"));
      if (data.originalDate === targetDate) return;
      if (data.eventType === "todo") {
        await supabase.from("todos").update({ due_date: targetDate }).eq("id", data.eventId);
        toast.success("Todo moved");
      } else if (data.eventType === "google") {
        const res = await fetch("/api/calendar/google", {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eventId: data.eventId, date: targetDate }),
        });
        if (!res.ok) throw new Error();
        toast.success("Event moved");
      } else if (data.eventType === "checklist") {
        await supabase.from("checklists").update({ due_date: targetDate }).eq("id", data.eventId);
        toast.success("Checklist moved");
      }
      queryClient.invalidateQueries({ queryKey: ["calendar"] });
      queryClient.invalidateQueries({ queryKey: ["google-calendar"] });
    } catch { toast.error("Failed to move event"); }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="-m-4 lg:-m-6 flex flex-col lg:flex-row h-[calc(100vh-4rem)] overflow-hidden">
      {/* Left: Calendar grid */}
      <div className="flex-1 flex items-start justify-center overflow-y-auto py-6">
        <div className="w-full max-w-[640px] px-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full press-effect" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h1 className="text-xl font-semibold min-w-[160px] text-center">
                {format(currentMonth, "MMMM yyyy")}
              </h1>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full press-effect" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-4 text-xs text-muted-foreground">
                {googleConnected && (
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ background: COLORS.google }} />Events
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ background: COLORS.todo }} />Todos
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ background: COLORS.checklist }} />Checklists
                </span>
              </div>
              <Button variant="outline" size="sm" className="h-7 text-xs press-effect" onClick={goToday}>
                Today
              </Button>
            </div>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 text-center mb-1">
            {WEEKDAYS.map((w) => (
              <div key={w} className="py-2 text-[11px] font-medium text-muted-foreground tracking-wide uppercase">
                {w}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 border-t border-l">
            {days.map((day) => {
              const dateStr = format(day, "yyyy-MM-dd");
              const dayEvs = getEvents(dateStr);
              const singleDay = dayEvs.filter((e) => !e.endDate || e.endDate === e.startDate);
              const inMonth = isSameMonth(day, currentMonth);
              const today = isToday(day);
              const isSelected = selectedDate === dateStr;
              const isDragOver = dragOverDate === dateStr;

              // Unique dots by type
              const seen = new Set<string>();
              const dots: string[] = [];
              for (const ev of singleDay) {
                if (!seen.has(ev.type)) { seen.add(ev.type); dots.push(ev.color); }
                if (dots.length >= 4) break;
              }
              const overflow = singleDay.length > 4 ? singleDay.length - 4 : 0;

              // Multi-day bars
              const bars = multiDayEvents.filter((e) => {
                const s = new Date(e.startDate);
                const end = new Date(e.endDate!);
                return day >= s && day <= end;
              });

              return (
                <button
                  key={dateStr}
                  type="button"
                  className={cn(
                    "relative flex flex-col min-h-[80px] p-2 text-left border-b border-r transition-colors group",
                    inMonth ? "bg-card" : "bg-card opacity-40",
                    today && "bg-primary/5",
                    isSelected && "bg-primary/5 ring-1 ring-primary ring-inset",
                    !isSelected && inMonth && "hover:bg-muted/30",
                    isDragOver && "ring-2 ring-primary ring-inset bg-primary/5",
                  )}
                  onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                  onDragOver={(e) => { e.preventDefault(); setDragOverDate(dateStr); }}
                  onDragLeave={() => setDragOverDate(null)}
                  onDrop={(e) => handleEventDrop(e, dateStr)}
                >
                  {/* Date number */}
                  <span className={cn(
                    "text-xs inline-flex items-center justify-center leading-none",
                    today
                      ? "bg-primary text-primary-foreground w-6 h-6 rounded-full font-medium"
                      : "text-muted-foreground",
                  )}>
                    {format(day, "d")}
                  </span>

                  {/* Dots */}
                  {dots.length > 0 && (
                    <div className="flex gap-1 mt-1.5 flex-wrap">
                      {dots.map((c, i) => (
                        <span key={i} className="w-[6px] h-[6px] rounded-full" style={{ background: c }} />
                      ))}
                      {overflow > 0 && <span className="text-[9px] text-muted-foreground leading-none">+{overflow}</span>}
                    </div>
                  )}

                  {/* Multi-day bars at bottom */}
                  {bars.length > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 space-y-[2px] px-0.5 pb-0.5">
                      {bars.slice(0, 3).map((ev) => {
                        const isFirst = dateStr === ev.startDate;
                        const isLast = dateStr === ev.endDate;
                        return (
                          <div
                            key={ev.id}
                            className={cn(
                              "h-[3px]",
                              isFirst && "rounded-l-sm ml-0",
                              isLast && "rounded-r-sm mr-0",
                              !isFirst && "-ml-0.5",
                              !isLast && "-mr-0.5",
                            )}
                            style={{ background: ev.color }}
                            title={ev.title}
                          />
                        );
                      })}
                      {bars.length > 3 && <span className="text-[8px] text-muted-foreground pl-0.5">+{bars.length - 3}</span>}
                    </div>
                  )}

                  {/* Hover + icon */}
                  <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Plus className="h-3 w-3 text-muted-foreground" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right: Detail panel — always visible on desktop */}
      <div className="hidden lg:block w-[340px] flex-shrink-0 border-l bg-card overflow-y-auto">
        <div className="p-5">
          {selectedDate ? (
            <>
              {/* Day header */}
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-sm font-semibold">{format(new Date(selectedDate + "T00:00:00"), "EEEE")}</p>
                  <p className="text-2xl font-bold">{format(new Date(selectedDate + "T00:00:00"), "d")}</p>
                  <p className="text-xs text-muted-foreground">{format(new Date(selectedDate + "T00:00:00"), "MMMM yyyy")}</p>
                </div>
                <Button variant="outline" size="icon" className="h-8 w-8 rounded-full press-effect" onClick={() => setShowQuickAdd(!showQuickAdd)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Quick add */}
              {showQuickAdd && (
                <div className="animate-center-scale-in mb-4 rounded-lg border p-3 space-y-2">
                  <Input
                    placeholder="Add event or todo..."
                    value={quickTitle}
                    onChange={(e) => setQuickTitle(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleQuickAdd(); }}
                    className="h-8 text-sm"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Input type="time" value={quickTime} onChange={(e) => setQuickTime(e.target.value)} className="w-28 h-8 text-xs" />
                    <Select value={quickType} onValueChange={(v) => setQuickType(v as "todo" | "google")}>
                      <SelectTrigger className="flex-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todo">Todo</SelectItem>
                        {googleConnected && <SelectItem value="google">Event</SelectItem>}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowQuickAdd(false)}>Cancel</Button>
                    <Button size="sm" className="h-7 text-xs press-effect" onClick={handleQuickAdd} disabled={!quickTitle.trim()}>Add</Button>
                  </div>
                </div>
              )}

              {/* Event list */}
              {selectedEvents.length === 0 && !showQuickAdd ? (
                <div className="text-center py-8">
                  <CalendarDays className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">No events</p>
                  <p className="text-xs text-muted-foreground mt-1">Click + to add one</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedEvents.map((ev) => (
                    <EventCard key={ev.id} event={ev} />
                  ))}
                </div>
              )}

              {/* Google hint */}
              {!googleConnected && (
                <div className="mt-6 rounded-lg bg-muted/30 p-3 text-center">
                  <p className="text-[11px] text-muted-foreground">
                    Connect Google Calendar in{" "}
                    <Link href="/dashboard/settings" className="underline underline-offset-2 hover:text-foreground">Settings</Link>
                    {" "}to sync events
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-20">
              <CalendarDays className="h-12 w-12 text-muted-foreground/20 mb-3" />
              <p className="text-sm text-muted-foreground">Select a date</p>
              <p className="text-xs text-muted-foreground mt-1">to view events and todos</p>
            </div>
          )}
        </div>
      </div>

      {/* Mobile: bottom panel */}
      {selectedDate && (
        <div className="lg:hidden border-t bg-card overflow-y-auto max-h-[50vh] animate-slide-up p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold">
              {format(new Date(selectedDate + "T00:00:00"), "EEEE, MMMM d")}
            </p>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowQuickAdd(!showQuickAdd)}>
                <Plus className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setSelectedDate(null); setShowQuickAdd(false); }}>
                <span className="text-xs">✕</span>
              </Button>
            </div>
          </div>
          {showQuickAdd && (
            <div className="animate-center-scale-in mb-3 rounded-lg border p-3 space-y-2">
              <Input placeholder="Add event or todo..." value={quickTitle} onChange={(e) => setQuickTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleQuickAdd(); }} className="h-8 text-sm" autoFocus />
              <div className="flex gap-2">
                <Input type="time" value={quickTime} onChange={(e) => setQuickTime(e.target.value)} className="w-28 h-8 text-xs" />
                <Select value={quickType} onValueChange={(v) => setQuickType(v as "todo" | "google")}>
                  <SelectTrigger className="flex-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">Todo</SelectItem>
                    {googleConnected && <SelectItem value="google">Event</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowQuickAdd(false)}>Cancel</Button>
                <Button size="sm" className="h-7 text-xs press-effect" onClick={handleQuickAdd} disabled={!quickTitle.trim()}>Add</Button>
              </div>
            </div>
          )}
          {selectedEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No events for this day</p>
          ) : (
            <div className="space-y-2">
              {selectedEvents.map((ev) => <EventCard key={ev.id} event={ev} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Event Card ─────────────────────────────────────────────────────────────

function EventCard({ event: ev }: { event: CalendarEvent }) {
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("application/json", JSON.stringify({
          eventId: ev.id, eventType: ev.type, originalDate: ev.startDate,
        }));
        e.dataTransfer.effectAllowed = "move";
      }}
      className={cn(
        "flex items-stretch gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition-all hover:bg-muted/30 cursor-grab active:cursor-grabbing",
        (ev.completed || ev.status === "completed") && "opacity-40",
      )}
    >
      <div className="w-[3px] self-stretch rounded-full shrink-0" style={{ background: ev.color }} />
      <div className="flex-1 min-w-0">
        <p className={cn(
          "font-medium text-[13px] truncate",
          (ev.completed || ev.status === "completed") && "line-through",
        )}>
          {ev.title}
        </p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {ev.time ? `${ev.time}${ev.endTime ? ` – ${ev.endTime}` : ""}` : "All day"}
          {" · "}
          {ev.type === "google" ? "Google Calendar" : ev.type === "todo" ? "Todo" : "Checklist"}
        </p>
      </div>
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function addHour(time: string): string {
  const [h, m] = time.split(":").map(Number);
  return `${String((h + 1) % 24).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
