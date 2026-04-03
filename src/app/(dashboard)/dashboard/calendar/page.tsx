"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameMonth, isToday } from "date-fns";
import { useBusinessStore } from "@/hooks/use-business";
import { fetchCurrentUser, fetchProfile, fetchCalendarEvents, userKeys, calendarKeys } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, CheckSquare, ListTodo, CalendarDays, Plus, X, Settings } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface CalendarEvent {
  id: string;
  title: string;
  date: string; // yyyy-MM-dd
  time?: string; // HH:mm (for sorting)
  endTime?: string;
  type: "google" | "todo" | "checklist";
  color: string;
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

const EVENT_COLORS: Record<CalendarEvent["type"], string> = {
  google: "bg-blue-400",
  todo: "bg-amber-400",
  checklist: "bg-primary",
};

export default function CalendarPage() {
  const currentBusiness = useBusinessStore((s) => s.currentBusiness);
  const businessId = currentBusiness?.id;
  const queryClient = useQueryClient();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddTitle, setQuickAddTitle] = useState("");

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

  // Fetch local events (todos + checklists)
  const { data: localEvents = [], isLoading: localLoading } = useQuery({
    queryKey: calendarKeys.events(businessId ?? "", monthStr),
    queryFn: () => fetchCalendarEvents(businessId!, userId!, mStart, mEnd),
    enabled: !!businessId && !!userId,
  });

  // Fetch Google Calendar events
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

  const googleEvents: GoogleApiEvent[] = googleData?.events ?? [];

  // Map all events to unified format
  const allEvents: CalendarEvent[] = [
    ...localEvents.map((e) => ({
      id: e.id,
      title: e.title,
      date: e.date,
      type: e.type as "todo" | "checklist",
      color: e.type === "todo" ? "bg-amber-400" : "bg-primary",
      completed: e.completed,
      status: e.status,
    })),
    ...googleEvents.map((ge) => {
      const startDate = ge.start.dateTime
        ? format(new Date(ge.start.dateTime), "yyyy-MM-dd")
        : ge.start.date ?? "";
      const startTime = ge.start.dateTime
        ? format(new Date(ge.start.dateTime), "HH:mm")
        : undefined;
      const endTime = ge.end.dateTime
        ? format(new Date(ge.end.dateTime), "HH:mm")
        : undefined;

      return {
        id: ge.id,
        title: ge.summary || "(No title)",
        date: startDate,
        time: startTime,
        endTime,
        type: "google" as const,
        color: "bg-blue-400",
      };
    }),
  ];

  // Quick add mutation
  const quickAddMutation = useMutation({
    mutationFn: async (payload: { summary: string; date: string }) => {
      const res = await fetch("/api/calendar/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          summary: payload.summary,
          start: payload.date,
          end: payload.date,
        }),
      });
      if (!res.ok) throw new Error("Failed to create event");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Event created");
      setQuickAddTitle("");
      setShowQuickAdd(false);
      queryClient.invalidateQueries({ queryKey: googleQueryKey });
    },
    onError: () => {
      toast.error("Failed to create event");
    },
  });

  // Build calendar grid
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart);
  const calEnd = endOfWeek(monthEnd);

  const days: Date[] = [];
  let day = calStart;
  while (day <= calEnd) {
    days.push(day);
    day = addDays(day, 1);
  }

  function eventsForDate(date: Date): CalendarEvent[] {
    const dateStr = format(date, "yyyy-MM-dd");
    return allEvents.filter((e) => e.date === dateStr);
  }

  const selectedEvents = selectedDate
    ? allEvents
        .filter((e) => e.date === selectedDate)
        .sort((a, b) => (a.time ?? "99:99").localeCompare(b.time ?? "99:99"))
    : [];

  const panelOpen = selectedDate !== null;

  function handleQuickAdd() {
    if (!quickAddTitle.trim() || !selectedDate) return;
    quickAddMutation.mutate({ summary: quickAddTitle.trim(), date: selectedDate });
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Calendar</h1>
        <p className="text-muted-foreground">Checklists, todos, and Google Calendar events</p>
      </div>

      {/* Desktop: side-by-side layout */}
      <div className="hidden lg:flex gap-4">
        {/* Calendar card — shrinks when panel open */}
        <div
          className="min-w-0 transition-all duration-300 ease-in-out"
          style={{ width: panelOpen ? "60%" : "100%" }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} aria-label="Previous month">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <CardTitle className="text-lg">{format(currentMonth, "MMMM yyyy")}</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} aria-label="Next month">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <CalendarGrid
                days={days}
                currentMonth={currentMonth}
                selectedDate={selectedDate}
                eventsForDate={eventsForDate}
                onSelectDate={(dateStr) => setSelectedDate(selectedDate === dateStr ? null : dateStr)}
              />
              <Legend googleConnected={googleConnected} />
            </CardContent>
          </Card>
        </div>

        {/* Side panel */}
        <div
          className={cn(
            "transition-all duration-300 ease-in-out overflow-hidden",
            panelOpen ? "w-[40%] opacity-100" : "w-0 opacity-0"
          )}
        >
          {selectedDate && (
            <Card className="h-full">
              <CardHeader className="border-l-2 border-l-primary">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    {format(new Date(selectedDate + "T00:00:00"), "EEEE, MMMM d, yyyy")}
                  </CardTitle>
                  <div className="flex items-center gap-1">
                    {googleConnected && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 shrink-0"
                        onClick={() => setShowQuickAdd((v) => !v)}
                        aria-label="Add event"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 shrink-0"
                      onClick={() => { setSelectedDate(null); setShowQuickAdd(false); }}
                      aria-label="Close panel"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {showQuickAdd && googleConnected && (
                  <div className="flex gap-2 mb-3">
                    <Input
                      placeholder="New event title..."
                      value={quickAddTitle}
                      onChange={(e) => setQuickAddTitle(e.target.value)}
                      className="h-8 text-sm"
                      onKeyDown={(e) => { if (e.key === "Enter") handleQuickAdd(); }}
                    />
                    <Button size="sm" className="h-8 press-effect" onClick={handleQuickAdd} disabled={quickAddMutation.isPending || !quickAddTitle.trim()}>
                      {quickAddMutation.isPending ? "..." : "Add"}
                    </Button>
                  </div>
                )}
                <EventList events={selectedEvents} />
                {!googleConnected && (
                  <GoogleHint />
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Mobile: stacked layout */}
      <div className="lg:hidden space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} aria-label="Previous month">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <CardTitle className="text-lg">{format(currentMonth, "MMMM yyyy")}</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} aria-label="Next month">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <CalendarGrid
              days={days}
              currentMonth={currentMonth}
              selectedDate={selectedDate}
              eventsForDate={eventsForDate}
              onSelectDate={(dateStr) => setSelectedDate(selectedDate === dateStr ? null : dateStr)}
            />
            <Legend googleConnected={googleConnected} />
          </CardContent>
        </Card>

        {selectedDate && (
          <Card>
            <CardHeader className="border-l-2 border-l-primary">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  {format(new Date(selectedDate + "T00:00:00"), "EEEE, MMMM d, yyyy")}
                </CardTitle>
                <div className="flex items-center gap-1">
                  {googleConnected && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 shrink-0"
                      onClick={() => setShowQuickAdd((v) => !v)}
                      aria-label="Add event"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 shrink-0"
                    onClick={() => { setSelectedDate(null); setShowQuickAdd(false); }}
                    aria-label="Close panel"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {showQuickAdd && googleConnected && (
                <div className="flex gap-2 mb-3">
                  <Input
                    placeholder="New event title..."
                    value={quickAddTitle}
                    onChange={(e) => setQuickAddTitle(e.target.value)}
                    className="h-8 text-sm"
                    onKeyDown={(e) => { if (e.key === "Enter") handleQuickAdd(); }}
                  />
                  <Button size="sm" className="h-8 press-effect" onClick={handleQuickAdd} disabled={quickAddMutation.isPending || !quickAddTitle.trim()}>
                    {quickAddMutation.isPending ? "..." : "Add"}
                  </Button>
                </div>
              )}
              <EventList events={selectedEvents} />
              {!googleConnected && (
                <GoogleHint />
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function CalendarGrid({
  days,
  currentMonth,
  selectedDate,
  eventsForDate,
  onSelectDate,
}: {
  days: Date[];
  currentMonth: Date;
  selectedDate: string | null;
  eventsForDate: (date: Date) => CalendarEvent[];
  onSelectDate: (dateStr: string) => void;
}) {
  return (
    <>
      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map((w) => (
          <div key={w} className="py-1 text-center text-xs font-medium text-muted-foreground">
            {w}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7">
        {days.map((d) => {
          const dateStr = format(d, "yyyy-MM-dd");
          const dayEvents = eventsForDate(d);
          const inMonth = isSameMonth(d, currentMonth);
          const today = isToday(d);
          const isSelected = selectedDate === dateStr;

          // Group dots by type, max 3 visible + overflow
          const typeSet = new Set(dayEvents.map((e) => e.type));
          const dotTypes = Array.from(typeSet).slice(0, 3);
          const overflow = dayEvents.length > 3 ? dayEvents.length - 3 : 0;

          return (
            <button
              key={dateStr}
              type="button"
              className={cn(
                "relative flex flex-col items-center gap-0.5 border border-transparent rounded-md p-1 min-h-[64px] transition-colors",
                inMonth ? "text-foreground" : "text-muted-foreground/40",
                today && "bg-primary/5",
                isSelected && "border-primary bg-primary/10",
                !isSelected && inMonth && "hover:bg-muted/50"
              )}
              onClick={() => onSelectDate(dateStr)}
            >
              <span className={cn(
                "text-sm font-mono",
                today && "font-bold text-primary"
              )}>
                {format(d, "d")}
              </span>
              {/* Colored dots by type */}
              {dayEvents.length > 0 && (
                <div className="flex items-center gap-0.5 justify-center">
                  {dotTypes.map((type) => (
                    <span key={type} className={cn("h-1.5 w-1.5 rounded-full", EVENT_COLORS[type])} />
                  ))}
                  {overflow > 0 && (
                    <span className="text-[10px] text-muted-foreground font-mono">
                      +{overflow}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </>
  );
}

function EventList({ events }: { events: CalendarEvent[] }) {
  if (events.length === 0) {
    return <p className="text-sm text-muted-foreground">Nothing scheduled for this day.</p>;
  }
  return (
    <div className="space-y-2">
      {events.map((ev) => (
        <div key={ev.id} className="flex items-center gap-3 rounded-md border px-3 py-2">
          {ev.type === "google" ? (
            <CalendarDays className="h-4 w-4 shrink-0 text-blue-400" />
          ) : ev.type === "checklist" ? (
            <CheckSquare className="h-4 w-4 shrink-0 text-primary" />
          ) : (
            <ListTodo className="h-4 w-4 shrink-0 text-amber-400" />
          )}
          <div className="flex-1 min-w-0">
            <span className={cn(
              "text-sm truncate block",
              (ev.completed || ev.status === "completed") && "line-through text-muted-foreground"
            )}>
              {ev.title}
            </span>
            {ev.time && (
              <span className="text-[11px] text-muted-foreground font-mono">
                {ev.time}{ev.endTime ? ` - ${ev.endTime}` : ""}
              </span>
            )}
          </div>
          <Badge variant="secondary" className="text-[10px] shrink-0">
            {ev.type === "google"
              ? "google"
              : ev.type === "checklist"
                ? (ev.status || "pending")
                : ev.completed ? "done" : "pending"}
          </Badge>
        </div>
      ))}
    </div>
  );
}

function Legend({ googleConnected }: { googleConnected: boolean }) {
  return (
    <div className="flex items-center gap-4 pt-3 text-xs text-muted-foreground">
      {googleConnected && (
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-400" /> Google</span>
      )}
      <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-primary" /> Checklist</span>
      <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400" /> Todo</span>
      <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Completed</span>
    </div>
  );
}

function GoogleHint() {
  return (
    <div className="mt-3 rounded-md border border-dashed px-3 py-2">
      <p className="text-xs text-muted-foreground">
        <CalendarDays className="inline h-3 w-3 mr-1 -translate-y-px" />
        Connect Google Calendar in{" "}
        <Link href="/dashboard/settings" className="underline underline-offset-2 hover:text-foreground">
          Settings
        </Link>{" "}
        to see your events here.
      </p>
    </div>
  );
}
