"use client";

import React, { useState, useEffect, useRef } from "react";
import { StickyNote as StickyNoteIcon, X, Trash2, ImagePlus } from "lucide-react";

interface Note {
  id: string;
  text: string;
}

type Corner = "top-left" | "top-right" | "bottom-left" | "bottom-right";

const BUTTON_STYLES: Record<Corner, string> = {
  "top-left": "fixed top-[76px] left-[272px] lg:left-[272px] z-50",
  "top-right": "fixed top-[76px] right-4 sm:right-6 z-50",
  "bottom-left": "fixed bottom-4 left-[272px] lg:left-[272px] sm:bottom-6 z-50",
  "bottom-right": "fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50",
};

function getNotePosition(corner: Corner): React.CSSProperties {
  switch (corner) {
    case "top-left": return { top: 128, left: 272 };
    case "top-right": return { top: 128, right: 16 };
    case "bottom-left": return { bottom: 72, left: 272 };
    case "bottom-right": return { bottom: 72, right: 16 };
  }
}

export function StickyNote() {
  const [isOpen, setIsOpen] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [corner, setCorner] = useState<Corner>("bottom-right");
  const [notes, setNotes] = useState<Note[]>([]);
  const [input, setInput] = useState("");
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoHover, setPhotoHover] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("bossboard-sticky-notes");
      if (saved) setNotes(JSON.parse(saved));
      const savedCorner = localStorage.getItem("bossboard-sticky-corner");
      if (savedCorner) setCorner(savedCorner as Corner);
      if (localStorage.getItem("bossboard-sticky-hidden") === "true") setIsHidden(true);
      const savedPhoto = localStorage.getItem("bossboard-sticky-photo");
      if (savedPhoto) setPhoto(savedPhoto);
    } catch {}
  }, []);

  function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setPhoto(dataUrl);
      localStorage.setItem("bossboard-sticky-photo", dataUrl);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function removePhoto() {
    setPhoto(null);
    localStorage.removeItem("bossboard-sticky-photo");
  }

  // Save notes
  useEffect(() => {
    localStorage.setItem("bossboard-sticky-notes", JSON.stringify(notes));
  }, [notes]);

  // Listen for toggle — both cross-tab (StorageEvent) and same-tab (CustomEvent)
  useEffect(() => {
    function handleStorage(e: StorageEvent) {
      if (e.key === "bossboard-sticky-hidden") setIsHidden(e.newValue === "true");
    }
    function handleCustomToggle(e: Event) {
      setIsHidden((e as CustomEvent).detail.hidden);
    }
    window.addEventListener("storage", handleStorage);
    window.addEventListener("bossboard-sticky-toggle", handleCustomToggle);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("bossboard-sticky-toggle", handleCustomToggle);
    };
  }, []);

  // Close context menu on click outside
  const ctxMenuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ctxMenu) return;
    const handler = (e: MouseEvent) => {
      // Don't close if clicking inside the context menu
      if (ctxMenuRef.current?.contains(e.target as Node)) return;
      setCtxMenu(null);
    };
    // Use setTimeout to avoid the same right-click event immediately closing the menu
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handler);
    }, 10);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handler);
    };
  }, [ctxMenu]);

  function addNote() {
    if (!input.trim()) return;
    setNotes((prev) => [...prev, { id: crypto.randomUUID(), text: input.trim() }]);
    setInput("");
    inputRef.current?.focus();
  }

  function deleteNote(id: string) {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    setCtxMenu({ x: e.clientX, y: e.clientY });
  }

  function setCornerPosition(c: Corner) {
    setCorner(c);
    localStorage.setItem("bossboard-sticky-corner", c);
    setCtxMenu(null);
  }

  function hideStickyNote() {
    localStorage.setItem("bossboard-sticky-hidden", "true");
    setIsHidden(true);
    setCtxMenu(null);
    window.dispatchEvent(new CustomEvent("bossboard-sticky-toggle", { detail: { hidden: true } }));
  }

  if (isHidden) return null;

  if (!isOpen) {
    return (
      <>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          onContextMenu={handleContextMenu}
          className={`${BUTTON_STYLES[corner]} flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-amber-500 text-white shadow-lg hover:bg-amber-600 transition-colors`}
          title="Quick Notes"
        >
          <StickyNoteIcon className="h-5 w-5" />
          {notes.length > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground font-bold">
              {notes.length}
            </span>
          )}
        </button>
        {ctxMenu && <CtxMenuOverlay ref={ctxMenuRef} ctxMenu={ctxMenu} setCornerPosition={setCornerPosition} hideStickyNote={hideStickyNote} />}
      </>
    );
  }

  return (
    <>
      {/* Keep the yellow button visible when note is open */}
      <button
        type="button"
        onClick={() => setIsOpen(false)}
        onContextMenu={handleContextMenu}
        className={`${BUTTON_STYLES[corner]} flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-amber-600 text-white shadow-lg hover:bg-amber-700 transition-colors ring-2 ring-amber-400/50`}
        title="Close Quick Notes"
      >
        <X className="h-5 w-5" />
      </button>

      <div
        className="fixed z-50 rounded-lg border shadow-2xl w-[calc(100vw-2rem)] sm:w-72 max-w-sm"
        style={{
          ...getNotePosition(corner),
          backgroundColor: "var(--card)",
          borderColor: "var(--border)",
        }}
      >
        {/* Title bar */}
        <div
          onContextMenu={handleContextMenu}
          className="flex items-center justify-between rounded-t-lg border-b px-3 py-2 select-none"
          style={{ backgroundColor: "var(--muted)" }}
        >
          <div className="flex items-center gap-2 text-sm font-medium">
            <StickyNoteIcon className="h-4 w-4 text-amber-500" />
            Quick Notes
            {notes.length > 0 && <span className="text-xs text-muted-foreground">({notes.length})</span>}
          </div>
          <button type="button" onClick={() => setIsOpen(false)} className="rounded p-0.5 text-muted-foreground hover:text-foreground" aria-label="Close notes">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Photo area */}
        <div className="px-3 pt-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoUpload}
          />
          {photo ? (
            <div
              className="relative rounded-md overflow-hidden"
              onMouseEnter={() => setPhotoHover(true)}
              onMouseLeave={() => setPhotoHover(false)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo}
                alt="Personal photo"
                className="w-full h-24 object-cover rounded-md"
              />
              {photoHover && (
                <button
                  type="button"
                  onClick={removePhoto}
                  className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                  aria-label="Remove photo"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-muted-foreground/30 py-3 text-xs text-muted-foreground hover:border-muted-foreground/50 hover:text-muted-foreground/80 transition-colors"
            >
              <ImagePlus className="h-3.5 w-3.5" />
              Add a photo
            </button>
          )}
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
                aria-label="Delete note"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="border-t p-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") addNote(); }}
            placeholder="Type a note and press Enter..."
            className="w-full rounded-md border bg-transparent px-2.5 py-1.5 text-sm outline-none placeholder:text-muted-foreground/50 focus:ring-1 focus:ring-primary"
            autoFocus
          />
        </div>
      </div>

      {ctxMenu && <CtxMenuOverlay ref={ctxMenuRef} ctxMenu={ctxMenu} setCornerPosition={setCornerPosition} hideStickyNote={hideStickyNote} />}
    </>
  );
}

const CtxMenuOverlay = React.forwardRef<HTMLDivElement, {
  ctxMenu: { x: number; y: number };
  setCornerPosition: (corner: Corner) => void;
  hideStickyNote: () => void;
}>(function CtxMenuOverlay({ ctxMenu, setCornerPosition, hideStickyNote }, ref) {
  return (
    <div
      ref={ref}
      className="fixed z-[60] w-48 rounded-md border bg-popover p-2 shadow-md text-popover-foreground"
      style={{ left: Math.min(ctxMenu.x, window.innerWidth - 210), top: Math.min(ctxMenu.y, window.innerHeight - 200) }}
    >
      <p className="px-1 pb-2 text-[10px] text-muted-foreground uppercase tracking-wide">Position</p>
      <div className="grid grid-cols-2 gap-2 mb-2">
        <button type="button" className="flex items-start justify-start rounded-md border border-border hover:border-primary hover:bg-primary/5 p-1.5 h-10 transition-colors" onClick={() => setCornerPosition("top-left")} title="Top left">
          <div className="h-2.5 w-2.5 rounded-sm bg-amber-500" />
        </button>
        <button type="button" className="flex items-start justify-end rounded-md border border-border hover:border-primary hover:bg-primary/5 p-1.5 h-10 transition-colors" onClick={() => setCornerPosition("top-right")} title="Top right">
          <div className="h-2.5 w-2.5 rounded-sm bg-amber-500" />
        </button>
        <button type="button" className="flex items-end justify-start rounded-md border border-border hover:border-primary hover:bg-primary/5 p-1.5 h-10 transition-colors" onClick={() => setCornerPosition("bottom-left")} title="Bottom left">
          <div className="h-2.5 w-2.5 rounded-sm bg-amber-500" />
        </button>
        <button type="button" className="flex items-end justify-end rounded-md border border-border hover:border-primary hover:bg-primary/5 p-1.5 h-10 transition-colors" onClick={() => setCornerPosition("bottom-right")} title="Bottom right">
          <div className="h-2.5 w-2.5 rounded-sm bg-amber-500" />
        </button>
      </div>
      <div className="border-t pt-1">
        <button type="button" className="flex w-full items-center rounded-sm px-2 py-1.5 text-xs text-destructive hover:bg-destructive/10" onClick={() => hideStickyNote()}>
          Hide sticky note
        </button>
      </div>
    </div>
  );
});
