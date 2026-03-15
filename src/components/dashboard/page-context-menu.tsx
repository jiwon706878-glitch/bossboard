"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  FileText,
  FolderPlus,
  CheckSquare,
  ListTodo,
  RefreshCw,
  ArrowUpDown,
  Clock,
} from "lucide-react";

interface MenuItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
}

interface Divider {
  type: "divider";
}

type MenuEntry = MenuItem | Divider;

interface MenuPosition {
  x: number;
  y: number;
}

function isDivider(entry: MenuEntry): entry is Divider {
  return "type" in entry && entry.type === "divider";
}

export function PageContextMenu() {
  const [menu, setMenu] = useState<MenuPosition | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();

  const close = useCallback(() => setMenu(null), []);

  // Close on click outside, escape, scroll
  useEffect(() => {
    if (!menu) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    function handleScroll() { close(); }

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [menu, close]);

  // Listen for contextmenu on the main element
  useEffect(() => {
    function handleContextMenu(e: MouseEvent) {
      const target = e.target as HTMLElement;

      // Allow default right-click on text inputs / editable areas
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable ||
        target.closest("[contenteditable]") ||
        target.closest("input") ||
        target.closest("textarea") ||
        target.closest("[data-radix-popper-content-wrapper]")
      ) {
        return; // Let browser show native copy/paste menu
      }

      e.preventDefault();
      setMenu({ x: e.clientX, y: e.clientY });
    }

    const main = document.querySelector("main");
    if (main) {
      main.addEventListener("contextmenu", handleContextMenu);
    }
    return () => {
      if (main) {
        main.removeEventListener("contextmenu", handleContextMenu);
      }
    };
  }, [pathname]);

  if (!menu) return null;

  // Build menu entries based on current page
  const entries: MenuEntry[] = [];

  if (pathname.startsWith("/dashboard/sops")) {
    entries.push({
      label: "New SOP",
      icon: FileText,
      action: () => { router.push("/dashboard/sops/new"); close(); },
    });
    entries.push({
      label: "New Folder",
      icon: FolderPlus,
      action: () => {
        close();
        const name = prompt("New folder name:");
        if (name?.trim()) {
          window.dispatchEvent(new CustomEvent("create-folder", { detail: name.trim() }));
        }
      },
    });
    entries.push({ type: "divider" });
    entries.push({
      label: "Sort by Name",
      icon: ArrowUpDown,
      action: () => { window.dispatchEvent(new CustomEvent("wiki-sort", { detail: "title" })); close(); },
    });
    entries.push({
      label: "Sort by Date",
      icon: Clock,
      action: () => { window.dispatchEvent(new CustomEvent("wiki-sort", { detail: "updated" })); close(); },
    });
    entries.push({ type: "divider" });
    entries.push({
      label: "Refresh",
      icon: RefreshCw,
      action: () => { window.dispatchEvent(new CustomEvent("wiki-refresh")); close(); },
    });
  } else if (pathname.startsWith("/dashboard/checklists")) {
    entries.push({
      label: "New Checklist",
      icon: CheckSquare,
      action: () => { router.push("/dashboard/checklists/new"); close(); },
    });
    entries.push({ type: "divider" });
    entries.push({
      label: "Refresh",
      icon: RefreshCw,
      action: () => { close(); router.refresh(); },
    });
  } else if (pathname === "/dashboard") {
    entries.push({
      label: "Add Todo",
      icon: ListTodo,
      action: () => {
        close();
        const input = document.querySelector<HTMLInputElement>('input[placeholder="Add a todo..."]');
        if (input) input.focus();
      },
    });
    entries.push({
      label: "New SOP",
      icon: FileText,
      action: () => { router.push("/dashboard/sops/new"); close(); },
    });
    entries.push({
      label: "New Checklist",
      icon: CheckSquare,
      action: () => { router.push("/dashboard/checklists/new"); close(); },
    });
    entries.push({ type: "divider" });
    entries.push({
      label: "Refresh",
      icon: RefreshCw,
      action: () => { close(); router.refresh(); },
    });
  } else {
    entries.push({
      label: "New SOP",
      icon: FileText,
      action: () => { router.push("/dashboard/sops/new"); close(); },
    });
    entries.push({
      label: "New Checklist",
      icon: CheckSquare,
      action: () => { router.push("/dashboard/checklists/new"); close(); },
    });
    entries.push({ type: "divider" });
    entries.push({
      label: "Refresh",
      icon: RefreshCw,
      action: () => { close(); router.refresh(); },
    });
  }

  const itemCount = entries.filter((e) => !isDivider(e)).length;
  const dividerCount = entries.filter((e) => isDivider(e)).length;

  return (
    <div
      ref={ref}
      className="fixed z-50 w-44 rounded-md border bg-popover p-1 shadow-md"
      style={{
        left: Math.min(menu.x, window.innerWidth - 190),
        top: Math.min(menu.y, window.innerHeight - (itemCount * 30 + dividerCount * 9 + 12)),
      }}
    >
      {entries.map((entry, i) => {
        if (isDivider(entry)) {
          return <div key={`d-${i}`} className="my-1 h-px bg-border" />;
        }
        return (
          <button
            key={entry.label}
            type="button"
            className="flex w-full items-center gap-2 rounded-sm px-3 py-1.5 text-xs cursor-pointer transition-colors duration-100 hover:bg-muted text-foreground"
            onClick={entry.action}
          >
            <entry.icon className="h-3.5 w-3.5 text-muted-foreground" />
            {entry.label}
          </button>
        );
      })}
    </div>
  );
}
