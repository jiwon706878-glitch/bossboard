"use client";

import { useEffect, useRef } from "react";
import { FileText, Pencil, Pin, FolderInput, Trash2 } from "lucide-react";
import type { FolderRow } from "@/types/sops";

interface SOPContextMenuProps {
  menu: { x: number; y: number };
  onClose: () => void;
  onOpen: () => void;
  onEdit: () => void;
  onPin: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onMove: (folderId: string) => void;
  folders: FolderRow[];
  isPinned: boolean;
}

export function SOPContextMenu({
  menu,
  onClose,
  onOpen,
  onEdit,
  onPin,
  onDuplicate,
  onDelete,
  onMove,
  folders,
  isPinned,
}: SOPContextMenuProps) {
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
      className="fixed z-50 w-48 rounded-md border bg-popover p-1 shadow-md"
      style={{
        left: Math.min(menu.x, window.innerWidth - 200),
        top: Math.min(menu.y, window.innerHeight - 260),
      }}
    >
      <button type="button" className={cls} onClick={onOpen}>
        <FileText className="h-3 w-3" /> Open
      </button>
      <button type="button" className={cls} onClick={onEdit}>
        <Pencil className="h-3 w-3" /> Edit
      </button>
      <div className="my-1 h-px bg-border" />
      {folders.slice(0, 6).map((f) => (
        <button key={f.id} type="button" className={cls} onClick={() => onMove(f.id)}>
          <FolderInput className="h-3 w-3" /> {f.name}
        </button>
      ))}
      <div className="my-1 h-px bg-border" />
      <button type="button" className={cls} onClick={onPin}>
        <Pin className="h-3 w-3" /> {isPinned ? "Unpin" : "Pin"}
      </button>
      <button type="button" className={cls} onClick={onDuplicate}>
        <FileText className="h-3 w-3" /> Duplicate
      </button>
      <div className="my-1 h-px bg-border" />
      <button
        type="button"
        className="flex w-full items-center gap-2 rounded-sm px-3 py-1.5 text-xs cursor-pointer hover:bg-destructive/10 text-destructive"
        onClick={onDelete}
      >
        <Trash2 className="h-3 w-3" /> Delete
      </button>
    </div>
  );
}
