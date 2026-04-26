import { readFile, writeFile, fileExists, createDirectory } from "@/lib/tauri/fs";

export interface CalendarEvent {
  id: string;
  title: string;
  /** ISO 8601, includes time. */
  start: string;
  /** ISO 8601, includes time. Optional — defaults to start + 1h on display. */
  end?: string;
  notes?: string;
  /** RGB hex without leading #, used for the dot/chip color. */
  color?: string;
  createdAt: string;
}

function workspaceRoot(): string {
  if (typeof window === "undefined" || typeof localStorage === "undefined") return "";
  return localStorage.getItem("bb_workspace_path") || "";
}

function calendarDir(): string {
  return `${workspaceRoot()}/Library/calendar`;
}

function eventsPath(): string {
  return `${calendarDir()}/events.json`;
}

export async function loadEvents(): Promise<CalendarEvent[]> {
  const root = workspaceRoot();
  if (!root) return [];
  try {
    if (!(await fileExists(eventsPath()))) return [];
    const raw = await readFile(eventsPath());
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CalendarEvent[]) : [];
  } catch {
    return [];
  }
}

export async function saveEvents(events: CalendarEvent[]): Promise<void> {
  const root = workspaceRoot();
  if (!root) throw new Error("No workspace selected.");
  await createDirectory(calendarDir()).catch(() => {
    /* directory may already exist */
  });
  await writeFile(eventsPath(), JSON.stringify(events, null, 2));
}

export async function upsertEvent(event: CalendarEvent): Promise<CalendarEvent[]> {
  const all = await loadEvents();
  const next = [...all.filter((e) => e.id !== event.id), event].sort((a, b) =>
    a.start.localeCompare(b.start),
  );
  await saveEvents(next);
  return next;
}

export async function deleteEvent(id: string): Promise<CalendarEvent[]> {
  const all = await loadEvents();
  const next = all.filter((e) => e.id !== id);
  await saveEvents(next);
  return next;
}
