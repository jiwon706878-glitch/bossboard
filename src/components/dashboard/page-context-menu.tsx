"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { FileText, Plus, FolderPlus, CheckSquare, ListTodo, RefreshCw } from "lucide-react";

interface MenuItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
}

interface MenuPosition {
  x: number;
  y: number;
}

export function PageContextMenu() {
  const [menu, setMenu] = useState<MenuPosition | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();

  const close = useCallback(() => setMenu(null), []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    function handleScroll() { close(); }

    if (menu) {
      document.addEventListener("mousedown", handleClick);
      document.addEventListener("keydown", handleKey);
      window.addEventListener("scroll", handleScroll, true);
    }
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

      // Don't override if the target or ancestor already handles context menu
      // (SOP rows, folder items, etc. call e.stopPropagation)
      // Also skip inputs, textareas, contenteditable
      if (
        target.closest("input") ||
        target.closest("textarea") ||
        target.closest("[contenteditable]") ||
        target.closest("[data-radix-popper-content-wrapper]")
      ) {
        return;
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

  // Build menu items based on current page
  const items: MenuItem[] = [];

  if (pathname.startsWith("/dashboard/sops")) {
    items.push({
      label: "New SOP",
      icon: FileText,
      action: () => { router.push("/dashboard/sops/new"); close(); },
    });
    items.push({
      label: "New Folder",
      icon: FolderPlus,
      action: () => {
        close();
        const name = prompt("New folder name:");
        if (name?.trim()) {
          // Dispatch custom event for the SOPs page to handle
          window.dispatchEvent(new CustomEvent("create-folder", { detail: name.trim() }));
        }
      },
    });
  } else if (pathname.startsWith("/dashboard/checklists")) {
    items.push({
      label: "New Checklist",
      icon: CheckSquare,
      action: () => { router.push("/dashboard/checklists/new"); close(); },
    });
  } else if (pathname === "/dashboard") {
    items.push({
      label: "New Todo",
      icon: ListTodo,
      action: () => {
        close();
        // Focus the todo input
        const input = document.querySelector<HTMLInputElement>('input[placeholder="Add a todo..."]');
        if (input) input.focus();
      },
    });
    items.push({
      label: "New SOP",
      icon: FileText,
      action: () => { router.push("/dashboard/sops/new"); close(); },
    });
    items.push({
      label: "Refresh",
      icon: RefreshCw,
      action: () => { close(); router.refresh(); },
    });
  } else {
    // Generic fallback
    items.push({
      label: "New SOP",
      icon: FileText,
      action: () => { router.push("/dashboard/sops/new"); close(); },
    });
    items.push({
      label: "New Checklist",
      icon: CheckSquare,
      action: () => { router.push("/dashboard/checklists/new"); close(); },
    });
  }

  const cls = "flex w-full items-center gap-2 rounded-sm px-3 py-1.5 text-xs cursor-pointer transition-colors duration-100 hover:bg-muted text-foreground";

  return (
    <div
      ref={ref}
      className="fixed z-50 w-44 rounded-md border bg-popover p-1 shadow-md"
      style={{
        left: Math.min(menu.x, window.innerWidth - 190),
        top: Math.min(menu.y, window.innerHeight - (items.length * 32 + 16)),
      }}
    >
      {items.map((item) => (
        <button key={item.label} type="button" className={cls} onClick={item.action}>
          <item.icon className="h-3.5 w-3.5" />
          {item.label}
        </button>
      ))}
    </div>
  );
}
