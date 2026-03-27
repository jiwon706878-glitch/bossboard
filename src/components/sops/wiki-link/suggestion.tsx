"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
  useCallback,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { useBusinessStore } from "@/hooks/use-business";
import { FileText } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SuggestionItem {
  id: string;
  title: string;
}

interface SuggestionListProps {
  items: SuggestionItem[];
  command: (item: SuggestionItem) => void;
}

export const SuggestionList = forwardRef<
  { onKeyDown: (props: { event: KeyboardEvent }) => boolean },
  SuggestionListProps
>(function SuggestionList({ items, command }, ref) {
  const [selectedIndex, setSelectedIndex] = useState(0);

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
        setSelectedIndex((i) => (i + items.length - 1) % items.length);
        return true;
      }
      if (event.key === "ArrowDown") {
        setSelectedIndex((i) => (i + 1) % items.length);
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
        <p className="text-xs text-muted-foreground px-2 py-1">No documents found</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border bg-popover p-1 shadow-md max-h-[200px] overflow-y-auto w-64">
      {items.map((item, index) => (
        <button
          key={item.id}
          type="button"
          className={cn(
            "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs text-left transition-colors",
            index === selectedIndex ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/50"
          )}
          onClick={() => selectItem(index)}
        >
          <FileText className="h-3 w-3 shrink-0" />
          <span className="truncate">{item.title}</span>
        </button>
      ))}
    </div>
  );
});

// Fetcher function used by the suggestion config
export function createSuggestionItems(businessId: string | undefined) {
  const supabase = createClient();

  return async ({ query }: { query: string }): Promise<SuggestionItem[]> => {
    if (!businessId) return [];

    let q = supabase
      .from("sops")
      .select("id, title")
      .eq("business_id", businessId)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .limit(10);

    if (query) {
      q = q.ilike("title", `%${query}%`);
    }

    const { data } = await q;
    return (data ?? []).map((s) => ({ id: s.id, title: s.title }));
  };
}
