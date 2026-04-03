"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, addMonths, subMonths, isSameMonth, isToday, isSameDay, differenceInCalendarDays,
} from "date-fns";
import { useBusinessStore } from "@/hooks/use-business";
import { fetchCurrentUser, fetchProfile, fetchCalendarEvents, userKeys, calendarKeys } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { ChevronLeft, ChevronRight, Plus, X, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

// ─── Types ──────────────────────────────────────────────────────────────────

interface CalendarEvent {
  id: string;
  title: string;
  startDate: string; // yyyy-MM-dd
  endDate?: string;  // yyyy-MM-dd for multi-day
  time?: string;     // HH:mm
  endTime?: string;
  type: "google" | "todo" | "checklist";
  color: string;     // hex color for bars/dots
  completed?: boolean;
  status?: string;
}

interface GoogleApiEvent {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const COLORS = {
  google: "#378ADD",
  todo: "#1D9E75",
  checklist: "#EF9F27",
} as const;

// ─── Page ───────────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const currentBusiness = useBusinessStore((s) => s.currentBusiness);
  const businessId = currentBusiness?.id;
  const queryClient = useQueryClient();
  const supabase = createClient();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);

  // Quick add state
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

  const googleApiEvents: GoogleApiEvent[] = googleData?.events ?? [];

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
    ...googleApiEvents.map((ge) => {
      const sd = ge.start.dateTime ? format(new Date(ge.start.dateTime), "yyyy-MM-dd") : ge.start.date ?? "";
      const ed = ge.end?.dateTime ? format(new Date(ge.end.dateTime), "yyyy-MM-dd") : ge.end?.date ?? sd;
      // Google all-day events have exclusive end date — subtract 1 day
      const adjustedEnd = !ge.start.dateTime && ge.end?.date
        ? format(addDays(new Date(ge.end.date), -1), "yyyy-MM-dd")
        : ed;
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

  // ─── Events grouped by date ───────────────────────────────────────────────

  const eventsByDate = new Map<string, CalendarEvent[]>();
  for (const ev of allEvents) {
    if (ev.endDate && ev.endDate > ev.startDate) {
      // Multi-day: add to each date in range
      let d = new Date(ev.startDate);
      const end = new Date(ev.endDate);
      while (d <= end) {
        const key = format(d, "yyyy-MM-dd");
        if (!eventsByDate.has(key)) eventsByDate.set(key, []);
        eventsByDate.get(key)!.push(ev);
        d = addDays(d, 1);
      }
    } else {
      const key = ev.startDate;
      if (!eventsByDate.has(key)) eventsByDate.set(key, []);
      eventsByDate.get(key)!.push(ev);
    }
  }

  // Separate multi-day events for bar rendering
  const multiDayEvents = allEvents.filter((e) => e.endDate && e.endDate > e.startDate);

  function eventsForDate(dateStr: string) {
    return eventsByDate.get(dateStr) ?? [];
  }

  // ─── Selected day events ──────────────────────────────────────────────────

  const selectedEvents = selectedDate
    ? eventsForDate(selectedDate).sort((a, b) => {
        // Timed first, then all-day, then todos, then checklists
        if (a.time && !b.time) return -1;
        if (!a.time && b.time) return 1;
        if (a.time && b.time) return a.time.localeCompare(b.time);
        return 0;
      })
    : [];

  const panelOpen = selectedDate !== null;

  // ─── Calendar grid ────────────────────────────────────────────────────────

  const monthStart2 = startOfMonth(currentMonth);
  const monthEnd2 = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart2);
  const calEnd = endOfWeek(monthEnd2);
  const days: Date[] = [];
  let d = calStart;
  while (d <= calEnd) { days.push(d); d = addDays(d, 1); }

  // ─── Handlers ─────────────────────────────────────────────────────────────

  function goToday() {
    setCurrentMonth(new Date());
    setSelectedDate(format(new Date(), "yyyy-MM-dd"));
  }

  async function handleQuickAdd() {
    if (!quickTitle.trim() || !selectedDate) return;

    if (quickType === "todo") {
      const { error } = await supabase.from("todos").insert({
        user_id: userId,
        text: quickTitle.trim(),
        due_date: selectedDate,
        completed: false,
      });
      if (error) { toast.error("Failed to create todo"); return; }
      toast.success("Todo created");
      queryClient.invalidateQueries({ queryKey: ["calendar"] });
    } else if (quickType === "google") {
      if (!googleConnected) { toast.error("Connect Google Calendar in Settings first"); return; }
      const start = quickTime ? { dateTime: `${selectedDate}T${quickTime}:00` } : { date: selectedDate };
      const end = quickTime
        ? { dateTime: `${selectedDate}T${addHour(quickTime)}:00` }
        : { date: format(addDays(new Date(selectedDate), 1), "yyyy-MM-dd") };
      const res = await fetch("/api/calendar/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summary: quickTitle.trim(), start, end }),
      });
      if (!res.ok) { toast.error("Failed to create event"); return; }
      toast.success("Event created");
      queryClient.invalidateQueries({ queryKey: googleQueryKey });
    }
    setQuickTitle("");
    setQuickTime("");
    setShowQuickAdd(false);
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
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
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
    } catch {
      toast.error("Failed to move event");
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8 press-effect" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 press-effect" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-semibold ml-1">{format(currentMonth, "MMMM yyyy")}</h1>
        </div>
        <div className="flex items-center gap-3">
          {/* Legend */}
          <div className="hidden sm:flex items-center gap-3 text-[11px] text-muted-foreground">
            {googleConnected && <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: COLORS.google }} />Events</span>}
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: COLORS.todo }} />Todos</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: COLORS.checklist }} />Checklists</span>
          </div>
          <Button variant="outline" size="sm" className="text-xs press-effect" onClick={goToday}>Today</Button>
        </div>
      </div>

      {/* Main layout: grid + side panel */}
      <div className="flex gap-0">
        {/* Calendar grid */}
        <div className={cn("flex-1 min-w-0 transition-all duration-300")}>
          {/* Weekday headers */}
          <div className="grid grid-cols-7 border-b">
            {WEEKDAYS.map((w) => (
              <div key={w} className="py-2 text-center text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                {w}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7">
            {days.map((day) => {
              const dateStr = format(day, "yyyy-MM-dd");
              const dayEvs = eventsForDate(dateStr);
              const singleDayEvs = dayEvs.filter((e) => !e.endDate || e.endDate === e.startDate);
              const inMonth = isSameMonth(day, currentMonth);
              const today = isToday(day);
              const isSelected = selectedDate === dateStr;
              const isDragOver = dragOverDate === dateStr;

              // Dots: unique types from single-day events, max 4
              const typesSeen = new Set<string>();
              const dots: string[] = [];
              for (const ev of singleDayEvs) {
                if (!typesSeen.has(ev.type)) { typesSeen.add(ev.type); dots.push(ev.color); }
                if (dots.length >= 4) break;
              }
              const overflow = singleDayEvs.length > 4 ? singleDayEvs.length - 4 : 0;

              // Multi-day bars for this day
              const barsForDay = multiDayEvents.filter((e) => {
                const s = new Date(e.startDate);
                const end = new Date(e.endDate!);
                return day >= s && day <= end;
              });

              return (
                <button
                  key={dateStr}
                  type="button"
                  className={cn(
                    "relative flex flex-col items-start border-b border-r p-1 min-h-[80px] transition-colors text-left",
                    inMonth ? "bg-card" : "bg-muted/20",
                    isSelected && "bg-primary/5",
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
                    "text-[11px] font-medium leading-none mb-1",
                    !inMonth && "text-muted-foreground/40",
                    today && "flex items-center justify-center h-[22px] w-[22px] rounded-full bg-primary text-primary-foreground text-[11px] font-bold",
                  )}>
                    {format(day, "d")}
                  </span>

                  {/* Multi-day bars */}
                  {barsForDay.length > 0 && (
                    <div className="w-full space-y-[2px]">
                      {barsForDay.slice(0, 3).map((ev) => {
                        const isStart = dateStr === ev.startDate;
                        const isEnd = dateStr === ev.endDate;
                        return (
                          <div
                            key={ev.id}
                            className={cn(
                              "h-[3px] -mx-1",
                              isStart && "ml-1 rounded-l-full",
                              isEnd && "mr-1 rounded-r-full",
                            )}
                            style={{ background: ev.color }}
                            title={ev.title}
                          />
                        );
                      })}
                      {barsForDay.length > 3 && (
                        <span className="text-[8px] text-muted-foreground pl-1">+{barsForDay.length - 3}</span>
                      )}
                    </div>
                  )}

                  {/* Single-day event dots */}
                  {dots.length > 0 && (
                    <div className="flex items-center gap-[3px] mt-auto pt-0.5">
                      {dots.map((color, i) => (
                        <span key={i} className="h-[6px] w-[6px] rounded-full" style={{ background: color }} />
                      ))}
                      {overflow > 0 && <span className="text-[8px] text-muted-foreground">+{overflow}</span>}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right side panel */}
        {panelOpen && (
          <div className="hidden lg:block w-80 border-l animate-center-scale-in" style={{ transformOrigin: "left center" }}>
            <DayDetailPanel
              date={selectedDate!}
              events={selectedEvents}
              googleConnected={googleConnected}
              showQuickAdd={showQuickAdd}
              quickTitle={quickTitle}
              quickTime={quickTime}
              quickType={quickType}
              onSetShowQuickAdd={setShowQuickAdd}
              onSetQuickTitle={setQuickTitle}
              onSetQuickTime={setQuickTime}
              onSetQuickType={setQuickType}
              onQuickAdd={handleQuickAdd}
              onClose={() => { setSelectedDate(null); setShowQuickAdd(false); }}
            />
          </div>
        )}
      </div>

      {/* Mobile: bottom panel */}
      {panelOpen && (
        <div className="lg:hidden animate-slide-up">
          <DayDetailPanel
            date={selectedDate!}
            events={selectedEvents}
            googleConnected={googleConnected}
            showQuickAdd={showQuickAdd}
            quickTitle={quickTitle}
            quickTime={quickTime}
            quickType={quickType}
            onSetShowQuickAdd={setShowQuickAdd}
            onSetQuickTitle={setQuickTitle}
            onSetQuickTime={setQuickTime}
            onSetQuickType={setQuickType}
            onQuickAdd={handleQuickAdd}
            onClose={() => { setSelectedDate(null); setShowQuickAdd(false); }}
          />
        </div>
      )}
    </div>
  );
}

// ─── Day Detail Panel ───────────────────────────────────────────────────────

function DayDetailPanel({
  date, events, googleConnected,
  showQuickAdd, quickTitle, quickTime, quickType,
  onSetShowQuickAdd, onSetQuickTitle, onSetQuickTime, onSetQuickType,
  onQuickAdd, onClose,
}: {
  date: string;
  events: CalendarEvent[];
  googleConnected: boolean;
  showQuickAdd: boolean;
  quickTitle: string;
  quickTime: string;
  quickType: "todo" | "google";
  onSetShowQuickAdd: (v: boolean) => void;
  onSetQuickTitle: (v: string) => void;
  onSetQuickTime: (v: string) => void;
  onSetQuickType: (v: "todo" | "google") => void;
  onQuickAdd: () => void;
  onClose: () => void;
}) {
  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-medium">
          {format(new Date(date + "T00:00:00"), "EEEE, MMMM d")}
        </h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="flex items-center justify-center h-6 w-6 rounded-full border text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
            onClick={() => onSetShowQuickAdd(!showQuickAdd)}
            aria-label="Add event"
          >
            <Plus className="h-3 w-3" />
          </button>
          <button
            type="button"
            className="flex items-center justify-center h-6 w-6 rounded-full text-muted-foreground hover:text-foreground transition-colors"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Quick add form */}
      {showQuickAdd && (
        <div className="animate-center-scale-in border rounded-lg p-3 space-y-2">
          <Input
            placeholder="Event title"
            value={quickTitle}
            onChange={(e) => onSetQuickTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") onQuickAdd(); }}
            className="h-8 text-sm"
            autoFocus
          />
          <div className="flex gap-2">
            <Input
              type="time"
              value={quickTime}
              onChange={(e) => onSetQuickTime(e.target.value)}
              className="h-8 text-sm w-[110px]"
              placeholder="Time"
            />
            <Select value={quickType} onValueChange={(v) => onSetQuickType(v as "todo" | "google")}>
              <SelectTrigger className="h-8 text-sm flex-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todo">Todo</SelectItem>
                {googleConnected && <SelectItem value="google">Event</SelectItem>}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onSetShowQuickAdd(false)}>Cancel</Button>
            <Button size="sm" className="h-7 text-xs press-effect" onClick={onQuickAdd} disabled={!quickTitle.trim()}>Add</Button>
          </div>
        </div>
      )}

      {/* Event list */}
      {events.length === 0 && !showQuickAdd ? (
        <p className="text-sm text-muted-foreground py-4">No events for this day.</p>
      ) : (
        <div className="space-y-1.5">
          {events.map((ev) => (
            <div
              key={ev.id}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("application/json", JSON.stringify({
                  eventId: ev.id,
                  eventType: ev.type,
                  originalDate: ev.startDate,
                }));
                e.dataTransfer.effectAllowed = "move";
              }}
              className="flex items-stretch gap-2.5 rounded-md border px-3 py-2 cursor-grab active:cursor-grabbing hover:bg-muted/30 transition-colors"
            >
              {/* Color accent bar */}
              <div className="w-[3px] rounded-full shrink-0 self-stretch" style={{ background: ev.color }} />
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "text-[13px] font-medium truncate",
                  (ev.completed || ev.status === "completed") && "line-through opacity-50",
                )}>
                  {ev.title}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {ev.time ? `${ev.time}${ev.endTime ? ` – ${ev.endTime}` : ""}` : "All day"}
                  {" · "}
                  {ev.type === "google" ? "Google Calendar" : ev.type === "todo" ? "Todo" : "Checklist"}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Google hint */}
      {!googleConnected && (
        <div className="rounded-md border border-dashed px-3 py-2 mt-2">
          <p className="text-[11px] text-muted-foreground">
            <CalendarDays className="inline h-3 w-3 mr-1 -translate-y-px" />
            Connect Google Calendar in{" "}
            <Link href="/dashboard/settings" className="underline underline-offset-2 hover:text-foreground">Settings</Link>
            {" "}to see your events here.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function addHour(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const nh = (h + 1) % 24;
  return `${String(nh).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
