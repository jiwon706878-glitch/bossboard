"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
  useCallback,
  useRef,
} from "react";
import { cn } from "@/lib/utils";
import type { SlashCommandItem } from "./items";

interface SlashCommandListProps {
  items: SlashCommandItem[];
  command: (item: SlashCommandItem) => void;
}

export const SlashCommandList = forwardRef<
  { onKeyDown: (props: { event: KeyboardEvent }) => boolean },
  SlashCommandListProps
>(function SlashCommandList({ items, command }, ref) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => setSelectedIndex(0), [items]);

  const selectItem = useCallback(
    (index: number) => {
      const item = items[index];
      if (item) command(item);
    },
    [items, command]
  );

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === "ArrowUp") {
        setSelectedIndex((prev) => {
          const next = (prev + items.length - 1) % items.length;
          setTimeout(() => {
            scrollRef.current?.querySelector(`[data-index="${next}"]`)?.scrollIntoView({ block: "nearest" });
          }, 0);
          return next;
        });
        return true;
      }
      if (event.key === "ArrowDown") {
        setSelectedIndex((prev) => {
          const next = (prev + 1) % items.length;
          setTimeout(() => {
            scrollRef.current?.querySelector(`[data-index="${next}"]`)?.scrollIntoView({ block: "nearest" });
          }, 0);
          return next;
        });
        return true;
      }
      if (event.key === "Enter") {
        selectItem(selectedIndex);
        return true;
      }
      return false;
    },
  }));

  if (items.length === 0) {
    return (
      <div className="rounded-md border bg-popover p-2 shadow-md">
        <p className="text-xs text-muted-foreground px-2 py-1">No commands found</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border bg-popover shadow-md w-[280px]">
      <div ref={scrollRef} className="max-h-[280px] overflow-y-auto p-1">
        {items.map((item, index) => (
          <button
            key={item.title}
            type="button"
            data-index={index}
            className={cn(
              "flex w-full items-center gap-3 rounded-sm px-2 py-1.5 text-left transition-colors",
              index === selectedIndex ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/50"
            )}
            onClick={() => selectItem(index)}
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded border bg-muted/50 text-xs">
              {item.icon}
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium text-foreground">{item.title}</p>
              <p className="text-[10px] text-muted-foreground truncate">{item.description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
});
