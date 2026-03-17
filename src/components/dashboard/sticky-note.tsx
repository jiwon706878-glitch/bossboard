"use client";

import { useState, useEffect, useRef } from "react";
import { StickyNote as StickyNoteIcon, X, Minus, Trash2 } from "lucide-react";

interface Note {
  id: string;
  text: string;
}

export function StickyNote() {
  const [isOpen, setIsOpen] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [input, setInput] = useState("");
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("bossboard-sticky-notes");
      if (saved) setNotes(JSON.parse(saved));
      const savedPos = localStorage.getItem("bossboard-sticky-pos");
      if (savedPos) {
        const parsed = JSON.parse(savedPos);
        if (parsed && (parsed.x !== 0 || parsed.y !== 0)) {
          setPosition(parsed);
        }
      }
    } catch {}
  }, []);

  // Save notes
  useEffect(() => {
    localStorage.setItem("bossboard-sticky-notes", JSON.stringify(notes));
  }, [notes]);

  function addNote() {
    if (!input.trim()) return;
    setNotes((prev) => [...prev, { id: crypto.randomUUID(), text: input.trim() }]);
    setInput("");
    inputRef.current?.focus();
  }

  function deleteNote(id: string) {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }

  const noteRef = useRef<HTMLDivElement>(null);

  // Drag title bar
  function handleMouseDown(e: React.MouseEvent) {
    // Get actual position of the note element on screen
    const rect = noteRef.current?.getBoundingClientRect();
    const currentX = rect?.left ?? 0;
    const currentY = rect?.top ?? 0;
    setIsDragging(true);
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: currentX, origY: currentY };
    // Switch from bottom/right positioning to top/left
    if (!position) {
      setPosition({ x: currentX, y: currentY });
    }
  }

  useEffect(() => {
    if (!isDragging) return;
    function handleMouseMove(e: MouseEvent) {
      if (!dragRef.current) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      const newPos = {
        x: Math.max(0, Math.min(window.innerWidth - 300, dragRef.current.origX + dx)),
        y: Math.max(0, Math.min(window.innerHeight - 100, dragRef.current.origY + dy)),
      };
      setPosition(newPos);
      localStorage.setItem("bossboard-sticky-pos", JSON.stringify(newPos));
    }
    function handleMouseUp() { setIsDragging(false); }
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-amber-500 text-white shadow-lg hover:bg-amber-600 transition-colors"
        title="Quick Notes"
      >
        <StickyNoteIcon className="h-5 w-5" />
        {notes.length > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground font-bold">
            {notes.length}
          </span>
        )}
      </button>
    );
  }

  return (
    <div
      ref={noteRef}
      className="fixed z-50 rounded-lg border shadow-2xl w-[calc(100vw-2rem)] sm:w-72 max-w-sm"
      style={{
        ...(position
          ? { left: position.x, top: position.y }
          : { bottom: 80, right: 16 }),
        backgroundColor: "var(--card)",
        borderColor: "var(--border)",
      }}
    >
      {/* Title bar */}
      <div
        onMouseDown={handleMouseDown}
        className="flex items-center justify-between rounded-t-lg border-b px-3 py-2 cursor-move select-none"
        style={{ backgroundColor: "var(--muted)" }}
      >
        <div className="flex items-center gap-2 text-sm font-medium">
          <StickyNoteIcon className="h-4 w-4 text-amber-500" />
          Quick Notes
          {notes.length > 0 && <span className="text-xs text-muted-foreground">({notes.length})</span>}
        </div>
        <button type="button" onClick={() => setIsOpen(false)} className="rounded p-0.5 text-muted-foreground hover:text-foreground">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Notes list */}
      <div className="max-h-64 overflow-y-auto p-2">
        {notes.length === 0 && (
          <p className="py-6 text-center text-xs text-muted-foreground">No notes yet</p>
        )}
        {notes.map((note) => (
          <div key={note.id} className="group flex items-start gap-2 rounded px-2 py-1.5 hover:bg-muted/50">
            <span className="mt-0.5 text-amber-500 text-xs">&#x2022;</span>
            <span className="flex-1 text-sm leading-snug">{note.text}</span>
            <button
              type="button"
              onClick={() => deleteNote(note.id)}
              className="shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity mt-0.5"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="border-t p-2">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") addNote(); }}
            placeholder="Type a note and press Enter..."
            className="flex-1 rounded-md border bg-transparent px-2.5 py-1.5 text-sm outline-none placeholder:text-muted-foreground/50 focus:ring-1 focus:ring-primary"
            autoFocus
          />
        </div>
      </div>
    </div>
  );
}
