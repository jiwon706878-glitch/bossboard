"use client";

import { useState, useImperativeHandle, forwardRef, useRef, useCallback } from "react";
import { Trash2 } from "lucide-react";

export interface ChecklistEditorRef {
  getItems: () => { text: string; required: boolean }[];
}

const ChecklistEditor = forwardRef<ChecklistEditorRef>(function ChecklistEditor(_props, ref) {
  const [items, setItems] = useState<string[]>([""]);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const focusInput = useCallback((index: number) => {
    setTimeout(() => inputRefs.current[index]?.focus(), 10);
  }, []);

  useImperativeHandle(ref, () => ({
    getItems() {
      return items
        .filter((t) => t.trim())
        .map((t) => ({ text: t.trim(), required: true }));
    },
  }), [items]);

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      const next = [...items];
      next.splice(index + 1, 0, "");
      setItems(next);
      focusInput(index + 1);
    }
    if (e.key === "Backspace" && items[index] === "" && items.length > 1) {
      e.preventDefault();
      const next = items.filter((_, i) => i !== index);
      setItems(next);
      // Update checked indices
      const newChecked = new Set<number>();
      checked.forEach((ci) => {
        if (ci < index) newChecked.add(ci);
        else if (ci > index) newChecked.add(ci - 1);
      });
      setChecked(newChecked);
      focusInput(Math.max(0, index - 1));
    }
    if (e.key === "ArrowDown" && index < items.length - 1) {
      e.preventDefault();
      focusInput(index + 1);
    }
    if (e.key === "ArrowUp" && index > 0) {
      e.preventDefault();
      focusInput(index - 1);
    }
  }

  function toggleCheck(index: number) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  function removeItem(index: number) {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
    const newChecked = new Set<number>();
    checked.forEach((ci) => {
      if (ci < index) newChecked.add(ci);
      else if (ci > index) newChecked.add(ci - 1);
    });
    setChecked(newChecked);
  }

  return (
    <div className="rounded-md border bg-card">
      <div className="min-h-[300px] p-4 space-y-0.5">
        {items.map((item, i) => (
          <div key={i} className="group flex items-center gap-3 rounded-md px-1 py-1.5 hover:bg-muted/30 transition-colors">
            {/* Checkbox */}
            <button
              type="button"
              onClick={() => toggleCheck(i)}
              className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border-2 transition-all duration-150 ${
                checked.has(i)
                  ? "border-primary bg-primary"
                  : "border-border hover:border-primary"
              }`}
            >
              {checked.has(i) && (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="text-white">
                  <path d="M1.5 5L4 7.5L8.5 2.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
            {/* Text input */}
            <input
              ref={(el) => { inputRefs.current[i] = el; }}
              type="text"
              value={item}
              onChange={(e) => {
                const next = [...items];
                next[i] = e.target.value;
                setItems(next);
              }}
              onKeyDown={(e) => handleKeyDown(i, e)}
              placeholder={i === 0 && items.length === 1 ? "Type a checklist item and press Enter..." : ""}
              className={`flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/40 ${
                checked.has(i) ? "line-through text-muted-foreground/50" : "text-foreground"
              }`}
            />
            {/* Delete button */}
            {items.length > 1 && (
              <button
                type="button"
                onClick={() => removeItem(i)}
                className="shrink-0 text-muted-foreground/30 opacity-0 group-hover:opacity-100 hover:text-destructive transition-all"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
});

export default ChecklistEditor;
