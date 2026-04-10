"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search } from "lucide-react";

interface QuickActionsProps {
  onSearch: () => void;
}

/**
 * Three quick action buttons for the dashboard header.
 * Includes keyboard shortcuts: ⌘N (new page), ⌘T (new task), ⌘K (search).
 */
export function QuickActions({ onSearch }: QuickActionsProps) {
  const router = useRouter();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const meta = e.ctrlKey || e.metaKey;
      if (!meta) return;
      // Only fire if not in an input/textarea/contenteditable
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.key === "n") {
        e.preventDefault();
        router.push("/dashboard/sops/new");
      } else if (e.key === "t") {
        e.preventDefault();
        // Dispatch event for the dashboard to focus the todo input
        window.dispatchEvent(new CustomEvent("dashboard-focus-todo"));
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [router]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => router.push("/dashboard/sops/new")}
        className="press-effect inline-flex items-center gap-2 rounded-md border border-border bg-surface-elevated px-3 py-2 text-sm font-medium text-text-primary hover:bg-surface hover:border-text-tertiary transition-colors"
      >
        <Plus className="h-4 w-4" />
        <span>New Page</span>
        <kbd className="ml-1 rounded border border-border bg-bg px-1.5 py-0.5 text-[10px] font-mono text-text-tertiary">⌘N</kbd>
      </button>
      <button
        type="button"
        onClick={() => {
          window.dispatchEvent(new CustomEvent("dashboard-focus-todo"));
        }}
        className="press-effect inline-flex items-center gap-2 rounded-md border border-border bg-surface-elevated px-3 py-2 text-sm font-medium text-text-primary hover:bg-surface hover:border-text-tertiary transition-colors"
      >
        <Plus className="h-4 w-4" />
        <span>New Task</span>
        <kbd className="ml-1 rounded border border-border bg-bg px-1.5 py-0.5 text-[10px] font-mono text-text-tertiary">⌘T</kbd>
      </button>
      <button
        type="button"
        onClick={onSearch}
        className="press-effect inline-flex items-center gap-2 rounded-md border border-border bg-surface-elevated px-3 py-2 text-sm font-medium text-text-primary hover:bg-surface hover:border-text-tertiary transition-colors"
      >
        <Search className="h-4 w-4" />
        <span>Search</span>
        <kbd className="ml-1 rounded border border-border bg-bg px-1.5 py-0.5 text-[10px] font-mono text-text-tertiary">⌘K</kbd>
      </button>
    </div>
  );
}
