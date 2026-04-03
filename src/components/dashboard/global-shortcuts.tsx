"use client";

import { useEffect } from "react";

interface UndoEntry {
  type: string;
  data: any;
  timestamp: number;
}

const undoStack: UndoEntry[] = [];

export function pushUndo(entry: Omit<UndoEntry, "timestamp">) {
  undoStack.push({ ...entry, timestamp: Date.now() });
  if (undoStack.length > 20) undoStack.shift();
}

export function popUndo(): UndoEntry | null {
  while (undoStack.length > 0) {
    const entry = undoStack.pop()!;
    if (Date.now() - entry.timestamp < 5 * 60 * 1000) return entry;
  }
  return null;
}

export function GlobalShortcuts() {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;

      // Ctrl+Z — undo
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        const entry = popUndo();
        if (entry) {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent("bossboard-undo", { detail: entry }));
        }
      }

      if (isInput) return;

      // Delete/Backspace
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("bossboard-delete"));
      }
      // Ctrl+A
      if ((e.ctrlKey || e.metaKey) && e.key === "a") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("bossboard-select-all"));
      }
      // Escape
      if (e.key === "Escape") {
        window.dispatchEvent(new CustomEvent("bossboard-escape"));
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return null;
}
