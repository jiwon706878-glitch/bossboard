"use client";

import { useEffect, useRef } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";

interface FolderContextMenuProps {
  menu: { x: number; y: number };
  onClose: () => void;
  onRename: () => void;
  onDelete: () => void;
  onNewSop: () => void;
}

export function FolderContextMenu({
  menu,
  onClose,
  onRename,
  onDelete,
  onNewSop,
}: FolderContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h1 = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const h2 = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", h1);
    document.addEventListener("keydown", h2);
    return () => {
      document.removeEventListener("mousedown", h1);
      document.removeEventListener("keydown", h2);
    };
  }, [onClose]);

  const cls =
    "flex w-full items-center gap-2 rounded-sm px-3 py-1.5 text-xs cursor-pointer hover:bg-muted text-foreground";

  return (
    <div
      ref={ref}
      className="fixed z-50 w-44 rounded-md border bg-popover p-1 shadow-md"
      style={{
        left: Math.min(menu.x, window.innerWidth - 180),
        top: Math.min(menu.y, window.innerHeight - 120),
      }}
    >
      <button type="button" className={cls} onClick={onNewSop}>
        <Plus className="h-3 w-3" /> New SOP here
      </button>
      <div className="my-1 h-px bg-border" />
      <button type="button" className={cls} onClick={onRename}>
        <Pencil className="h-3 w-3" /> Rename
      </button>
      <button
        type="button"
        className="flex w-full items-center gap-2 rounded-sm px-3 py-1.5 text-xs cursor-pointer hover:bg-destructive/10 text-destructive"
        onClick={onDelete}
      >
        <Trash2 className="h-3 w-3" /> Delete folder
      </button>
    </div>
  );
}
