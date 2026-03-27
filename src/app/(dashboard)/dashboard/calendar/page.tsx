"use client";

import { useEffect, useState, useCallback } from "react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameMonth, isSameDay, isToday } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { useBusinessStore } from "@/hooks/use-business";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, CheckSquare, ListTodo } from "lucide-react";

interface CalendarEvent {
  id: string;
  title: string;
  date: string; // yyyy-MM-dd
  type: "checklist" | "todo";
  status?: string;
  completed?: boolean;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function CalendarPage() {
  const supabase = createClient();
  const currentBusiness = useBusinessStore((s) => s.currentBusiness);

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const loadEvents = useCallback(async () => {
    if (!currentBusiness?.id) return;
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const monthStart = format(startOfMonth(currentMonth), "yyyy-MM-dd");
    const monthEnd = format(endOfMonth(currentMonth), "yyyy-MM-dd");

    const [{ data: checklists }, { data: todos }] = await Promise.all([
      supabase
        .from("checklists")
        .select("id, title, due_date, status")
        .eq("business_id", currentBusiness.id)
        .gte("due_date", monthStart)
        .lte("due_date", monthEnd),
      supabase
        .from("todos")
        .select("id, text, due_date, completed")
        .eq("user_id", user.id)
        .gte("due_date", monthStart)
        .lte("due_date", monthEnd),
    ]);

    const mapped: CalendarEvent[] = [];
    for (const c of checklists ?? []) {
      if (c.due_date) {
        mapped.push({ id: c.id, title: c.title, date: c.due_date, type: "checklist", status: c.status });
      }
    }
    for (const t of todos ?? []) {
      if (t.due_date) {
        mapped.push({ id: t.id, title: t.text, date: t.due_date, type: "todo", completed: t.completed });
      }
    }

    setEvents(mapped);
    setLoading(false);
  }, [currentBusiness?.id, currentMonth, supabase]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

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

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Calendar</h1>
        <p className="text-muted-foreground">Checklists and todos by date</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <CardTitle className="text-lg">{format(currentMonth, "MMMM yyyy")}</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
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
                  onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                >
                  <span className={cn(
                    "text-sm font-mono",
                    today && "font-bold text-primary"
                  )}>
                    {format(d, "d")}
                  </span>
                  {/* Event dots */}
                  {dayEvents.length > 0 && (
                    <div className="flex gap-0.5 flex-wrap justify-center">
                      {dayEvents.slice(0, 3).map((ev) => (
                        <span
                          key={ev.id}
                          className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            ev.type === "checklist" ? "bg-primary" : "bg-amber-400",
                            (ev.completed || ev.status === "completed") && "bg-emerald-400"
                          )}
                        />
                      ))}
                      {dayEvents.length > 3 && (
                        <span className="text-[8px] text-muted-foreground">+{dayEvents.length - 3}</span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 pt-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-primary" /> Checklist</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400" /> Todo</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Completed</span>
          </div>
        </CardContent>
      </Card>

      {/* Selected date detail */}
      {selectedDate && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {format(new Date(selectedDate + "T00:00:00"), "EEEE, MMMM d, yyyy")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing scheduled for this day.</p>
            ) : (
              <div className="space-y-2">
                {selectedEvents.map((ev) => (
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
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
