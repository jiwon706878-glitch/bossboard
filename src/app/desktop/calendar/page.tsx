"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Modal } from "@/components/desktop/modal";
import { useConfirm } from "@/components/desktop/use-confirm";
import {
  loadEvents,
  upsertEvent,
  deleteEvent,
  type CalendarEvent,
} from "@/lib/calendar/events";

type View = "month" | "week" | "day";

function startOfWeek(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay(); // 0 = Sunday
  date.setDate(date.getDate() - day);
  date.setHours(0, 0, 0, 0);
  return date;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addDays(d: Date, n: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + n);
  return next;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function fmtMonth(d: Date): string {
  return d.toLocaleString(undefined, { month: "long", year: "numeric" });
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function isoLocalForInput(d: Date): string {
  // datetime-local needs YYYY-MM-DDTHH:MM (no Z, no seconds).
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

export default function CalendarPage() {
  const [view, setView] = useState<View>("month");
  const [cursor, setCursor] = useState<Date>(() => new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createPrefillDate, setCreatePrefillDate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { confirm, ConfirmComponent } = useConfirm();

  useEffect(() => {
    loadEvents()
      .then(setEvents)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const ev of events) {
      const d = new Date(ev.start);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      const arr = map.get(key) ?? [];
      arr.push(ev);
      map.set(key, arr);
    }
    return map;
  }, [events]);

  function eventsOn(d: Date): CalendarEvent[] {
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    return eventsByDay.get(key) ?? [];
  }

  function shift(direction: 1 | -1) {
    const next = new Date(cursor);
    if (view === "month") next.setMonth(next.getMonth() + direction);
    if (view === "week") next.setDate(next.getDate() + 7 * direction);
    if (view === "day") next.setDate(next.getDate() + direction);
    setCursor(next);
  }

  function todayClick() {
    setCursor(new Date());
  }

  function openCreate(date?: Date) {
    setCreatePrefillDate(date ?? new Date());
    setCreateOpen(true);
  }

  async function handleSave(ev: CalendarEvent) {
    try {
      const next = await upsertEvent(ev);
      setEvents(next);
      setCreateOpen(false);
      setEditing(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function handleDelete(id: string) {
    const ok = await confirm({
      title: "Delete this event?",
      description: "This removes it from the calendar. There's no undo.",
      variant: "danger",
      confirmLabel: "Delete",
    });
    if (!ok) return;
    try {
      const next = await deleteEvent(id);
      setEvents(next);
      setEditing(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Calendar</h1>
          <div className="flex items-center gap-2">
            <div className="flex rounded-md overflow-hidden border border-bb-border">
              {(["day", "week", "month"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`px-3 py-1 text-xs ${
                    view === v ? "bg-bb-primary text-white" : "bg-bb-card hover:bg-bb-bg"
                  }`}
                >
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </button>
              ))}
            </div>
            <button
              onClick={() => openCreate()}
              className="flex items-center gap-1 px-3 py-1.5 bg-bb-primary hover:bg-bb-primary-hover rounded-md text-sm"
            >
              <Plus className="w-4 h-4" /> New event
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-1">
            <button
              onClick={() => shift(-1)}
              className="p-1.5 hover:bg-bb-card rounded"
              aria-label="Previous"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => shift(1)}
              className="p-1.5 hover:bg-bb-card rounded"
              aria-label="Next"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={todayClick}
              className="ml-2 px-2 py-1 text-xs border border-bb-border hover:bg-bb-card rounded-md"
            >
              Today
            </button>
          </div>
          <h2 className="text-lg font-semibold">{fmtMonth(cursor)}</h2>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900/20 border border-red-800 rounded-md text-red-300 text-sm">
            {error}
            <button onClick={() => setError(null)} className="ml-2 text-xs underline">
              Dismiss
            </button>
          </div>
        )}

        {view === "month" && (
          <MonthGrid
            cursor={cursor}
            eventsOn={eventsOn}
            onDayClick={(d) => openCreate(d)}
            onEventClick={setEditing}
          />
        )}
        {view === "week" && (
          <WeekGrid
            cursor={cursor}
            eventsOn={eventsOn}
            onDayClick={(d) => openCreate(d)}
            onEventClick={setEditing}
          />
        )}
        {view === "day" && (
          <DayList
            cursor={cursor}
            events={eventsOn(cursor)}
            onCreate={() => openCreate(cursor)}
            onEventClick={setEditing}
          />
        )}
      </div>

      <AnimatePresence>
        {(createOpen || editing) && (
          <EventModal
            existing={editing}
            prefillDate={createPrefillDate}
            onSave={handleSave}
            onDelete={handleDelete}
            onClose={() => {
              setCreateOpen(false);
              setEditing(null);
            }}
          />
        )}
      </AnimatePresence>

      {ConfirmComponent}
    </div>
  );
}

function MonthGrid({
  cursor,
  eventsOn,
  onDayClick,
  onEventClick,
}: {
  cursor: Date;
  eventsOn: (d: Date) => CalendarEvent[];
  onDayClick: (d: Date) => void;
  onEventClick: (ev: CalendarEvent) => void;
}) {
  const monthStart = startOfMonth(cursor);
  const gridStart = startOfWeek(monthStart);
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const now = new Date();

  return (
    <div className="border border-bb-border rounded-md overflow-hidden">
      <div className="grid grid-cols-7 bg-bb-card">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="p-2 text-xs text-gray-400 text-center">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((d, i) => {
          const inMonth = d.getMonth() === cursor.getMonth();
          const isToday = isSameDay(d, now);
          const dayEvents = eventsOn(d);
          return (
            <button
              key={i}
              onClick={() => onDayClick(d)}
              className={`relative min-h-[88px] text-left p-1.5 border-t border-l border-bb-border hover:bg-bb-card/60 ${
                inMonth ? "" : "opacity-40"
              }`}
            >
              <div
                className={`text-xs inline-block w-6 h-6 rounded-full text-center leading-6 ${
                  isToday ? "bg-bb-primary text-white" : ""
                }`}
              >
                {d.getDate()}
              </div>
              <div className="mt-1 space-y-1">
                {dayEvents.slice(0, 3).map((ev) => (
                  <div
                    key={ev.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(ev);
                    }}
                    className="text-[11px] truncate px-1 py-0.5 rounded bg-bb-primary/20 text-bb-primary hover:bg-bb-primary/30"
                    style={ev.color ? { background: `#${ev.color}33`, color: `#${ev.color}` } : undefined}
                  >
                    {fmtTime(ev.start)} {ev.title}
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-[10px] text-gray-500">
                    +{dayEvents.length - 3} more
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function WeekGrid({
  cursor,
  eventsOn,
  onDayClick,
  onEventClick,
}: {
  cursor: Date;
  eventsOn: (d: Date) => CalendarEvent[];
  onDayClick: (d: Date) => void;
  onEventClick: (ev: CalendarEvent) => void;
}) {
  const start = startOfWeek(cursor);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const now = new Date();
  return (
    <div className="grid grid-cols-7 gap-2">
      {days.map((d) => {
        const isToday = isSameDay(d, now);
        const dayEvents = eventsOn(d);
        return (
          <div
            key={d.toISOString()}
            className="border border-bb-border rounded-md p-2 min-h-[260px] bg-bb-card/40"
          >
            <button
              onClick={() => onDayClick(d)}
              className="w-full text-left mb-2"
            >
              <div className="text-xs text-gray-400">
                {d.toLocaleString(undefined, { weekday: "short" })}
              </div>
              <div
                className={`text-lg font-semibold ${
                  isToday ? "text-bb-primary" : ""
                }`}
              >
                {d.getDate()}
              </div>
            </button>
            <div className="space-y-1">
              {dayEvents.length === 0 ? (
                <div className="text-[11px] text-gray-500">No events</div>
              ) : (
                dayEvents.map((ev) => (
                  <button
                    key={ev.id}
                    onClick={() => onEventClick(ev)}
                    className="w-full text-left text-xs px-1.5 py-1 rounded bg-bb-primary/20 text-bb-primary hover:bg-bb-primary/30"
                    style={
                      ev.color
                        ? { background: `#${ev.color}33`, color: `#${ev.color}` }
                        : undefined
                    }
                  >
                    <div className="font-medium truncate">{ev.title}</div>
                    <div className="text-[10px] opacity-80">{fmtTime(ev.start)}</div>
                  </button>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DayList({
  cursor,
  events,
  onCreate,
  onEventClick,
}: {
  cursor: Date;
  events: CalendarEvent[];
  onCreate: () => void;
  onEventClick: (ev: CalendarEvent) => void;
}) {
  return (
    <div className="border border-bb-border rounded-md p-4">
      <h3 className="font-semibold mb-3">
        {cursor.toLocaleDateString(undefined, {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
      </h3>
      {events.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm text-gray-400 mb-3">Nothing scheduled.</p>
          <button
            onClick={onCreate}
            className="px-3 py-1.5 bg-bb-primary hover:bg-bb-primary-hover rounded-md text-sm"
          >
            Add event
          </button>
        </div>
      ) : (
        <ul className="divide-y divide-bb-border">
          {events.map((ev) => (
            <li key={ev.id}>
              <button
                onClick={() => onEventClick(ev)}
                className="w-full text-left p-3 hover:bg-bb-card rounded-md"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ background: `#${ev.color ?? "4a6cf7"}` }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{ev.title}</div>
                    <div className="text-xs text-gray-400">
                      {fmtTime(ev.start)}
                      {ev.end && ` – ${fmtTime(ev.end)}`}
                    </div>
                  </div>
                </div>
                {ev.notes && (
                  <div className="text-xs text-gray-500 mt-1 line-clamp-2 ml-5">
                    {ev.notes}
                  </div>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EventModal({
  existing,
  prefillDate,
  onSave,
  onDelete,
  onClose,
}: {
  existing: CalendarEvent | null;
  prefillDate: Date | null;
  onSave: (ev: CalendarEvent) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const initialStart = existing
    ? new Date(existing.start)
    : (() => {
        const d = prefillDate ?? new Date();
        d.setMinutes(0, 0, 0);
        if (!prefillDate) d.setHours(d.getHours() + 1);
        return d;
      })();

  const [title, setTitle] = useState(existing?.title ?? "");
  const [start, setStart] = useState(isoLocalForInput(initialStart));
  const [end, setEnd] = useState(
    existing?.end ? isoLocalForInput(new Date(existing.end)) : "",
  );
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [color, setColor] = useState(existing?.color ?? "4a6cf7");

  function handleSubmit() {
    if (!title.trim()) return;
    onSave({
      id: existing?.id ?? crypto.randomUUID(),
      title: title.trim(),
      start: new Date(start).toISOString(),
      end: end ? new Date(end).toISOString() : undefined,
      notes: notes.trim() || undefined,
      color,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    });
  }

  return (
    <Modal isOpen={true} onClose={onClose} title={existing ? "Edit event" : "New event"}>
      <div className="space-y-3">
        <div>
          <label className="text-xs text-gray-400">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Team standup"
            className="w-full mt-1 p-2 bg-bb-bg border border-bb-border rounded-md text-sm"
            autoFocus
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-400">Start</label>
            <input
              type="datetime-local"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="w-full mt-1 p-2 bg-bb-bg border border-bb-border rounded-md text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400">End (optional)</label>
            <input
              type="datetime-local"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="w-full mt-1 p-2 bg-bb-bg border border-bb-border rounded-md text-sm"
            />
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-400">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full mt-1 p-2 bg-bb-bg border border-bb-border rounded-md text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-gray-400">Color</label>
          <div className="flex gap-2 mt-1">
            {["4a6cf7", "10b981", "f59e0b", "ef4444", "a855f7", "06b6d4"].map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-6 h-6 rounded-full ${
                  color === c ? "ring-2 ring-bb-fg" : ""
                }`}
                style={{ background: `#${c}` }}
                aria-label={`Color #${c}`}
              />
            ))}
          </div>
        </div>
        <div className="flex justify-between pt-3">
          {existing ? (
            <button
              onClick={() => onDelete(existing.id)}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-red-400 hover:bg-red-900/20 rounded-md"
            >
              <Trash2 className="w-4 h-4" /> Delete
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-sm border border-bb-border hover:bg-bb-bg rounded-md"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!title.trim()}
              className="px-3 py-1.5 text-sm bg-bb-primary hover:bg-bb-primary-hover disabled:opacity-50 rounded-md"
            >
              {existing ? "Save" : "Create"}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
