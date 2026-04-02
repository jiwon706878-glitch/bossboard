"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameMonth, isToday } from "date-fns";
import { useBusinessStore } from "@/hooks/use-business";
import { fetchCurrentUser, fetchCalendarEvents, userKeys, calendarKeys } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, CheckSquare, ListTodo, X } from "lucide-react";

interface CalendarEvent {
  id: string;
  title: string;
  date: string; // yyyy-MM-dd
  type: "checklist" | "todo";
  status?: string;
  completed?: boolean;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getDotColor(dayEvents: CalendarEvent[]): string {
  const allCompleted = dayEvents.every((e) => e.completed || e.status === "completed");
  if (allCompleted) return "bg-emerald-400";
  const allTodos = dayEvents.every((e) => e.type === "todo");
  if (allTodos) return "bg-amber-400";
  const allChecklists = dayEvents.every((e) => e.type === "checklist");
  if (allChecklists) return "bg-primary";
  return "bg-primary";
}

export default function CalendarPage() {
  const currentBusiness = useBusinessStore((s) => s.currentBusiness);
  const businessId = currentBusiness?.id;

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const { data: user } = useQuery({ queryKey: userKeys.current, queryFn: fetchCurrentUser, retry: false });
  const userId = user?.id;

  const monthStr = format(currentMonth, "yyyy-MM");
  const mStart = format(startOfMonth(currentMonth), "yyyy-MM-dd");
  const mEnd = format(endOfMonth(currentMonth), "yyyy-MM-dd");

  const { data: events = [], isLoading: loading } = useQuery({
    queryKey: calendarKeys.events(businessId ?? "", monthStr),
    queryFn: () => fetchCalendarEvents(businessId!, userId!, mStart, mEnd),
    enabled: !!businessId && !!userId,
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
    return events.filter((e) => e.date === dateStr);
  }

  const selectedEvents = selectedDate
    ? events.filter((e) => e.date === selectedDate)
    : [];

  const panelOpen = selectedDate !== null;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Calendar</h1>
        <p className="text-muted-foreground">Checklists and todos by date</p>
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
              <Legend />
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
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 shrink-0"
                    onClick={() => setSelectedDate(null)}
                    aria-label="Close panel"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <EventList events={selectedEvents} />
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
            <Legend />
          </CardContent>
        </Card>

        {selectedDate && (
          <Card>
            <CardHeader className="border-l-2 border-l-primary">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  {format(new Date(selectedDate + "T00:00:00"), "EEEE, MMMM d, yyyy")}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 shrink-0"
                  onClick={() => setSelectedDate(null)}
                  aria-label="Close panel"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <EventList events={selectedEvents} />
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
              {/* Event count badge */}
              {dayEvents.length > 0 && (
                <div className="flex items-center gap-0.5 justify-center">
                  <span className={cn("h-1.5 w-1.5 rounded-full", getDotColor(dayEvents))} />
                  {dayEvents.length > 1 && (
                    <span className="text-[10px] text-muted-foreground font-mono">
                      &times;{dayEvents.length}
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
          {ev.type === "checklist" ? (
            <CheckSquare className="h-4 w-4 shrink-0 text-primary" />
          ) : (
            <ListTodo className="h-4 w-4 shrink-0 text-amber-400" />
          )}
          <span className={cn(
            "text-sm flex-1 truncate",
            (ev.completed || ev.status === "completed") && "line-through text-muted-foreground"
          )}>
            {ev.title}
          </span>
          <Badge variant="secondary" className="text-[10px] shrink-0">
            {ev.type === "checklist" ? ev.status || "pending" : ev.completed ? "done" : "pending"}
          </Badge>
        </div>
      ))}
    </div>
  );
}

function Legend() {
  return (
    <div className="flex items-center gap-4 pt-3 text-xs text-muted-foreground">
      <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-primary" /> Checklist</span>
      <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400" /> Todo</span>
      <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Completed</span>
    </div>
  );
}
