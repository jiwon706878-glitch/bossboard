"use client";

import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FileText,
  ChevronUp,
  ChevronDown,
  Pin,
  MoreHorizontal,
  Pencil,
  Trash2,
  FolderInput,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SOP, FolderRow } from "@/types/sops";
import { STATUS_COLORS, formatShortDate } from "@/types/sops";

interface SopRowProps {
  sop: SOP;
  isSelected: boolean;
  onSelect: () => void;
  onDoubleClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  router: ReturnType<typeof useRouter>;
  onPin: (id: string, pinned: boolean) => void;
  onDelete: (id: string) => void;
  folders: FolderRow[];
  onMove: (sopId: string, folderId: string) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

export function SopRow({
  sop,
  isSelected,
  onSelect,
  onDoubleClick,
  onContextMenu,
  router,
  onPin,
  onDelete,
  folders,
  onMove,
  onMoveUp,
  onMoveDown,
}: SopRowProps) {
  return (
    <div
      data-has-context-menu
      className={cn(
        "group flex h-9 cursor-default items-center gap-1.5 border-b border-border/30 px-2 sm:px-4 text-sm transition-colors duration-75",
        isSelected ? "bg-primary/5 border-l-2 border-l-primary" : "hover:bg-muted/30"
      )}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", sop.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      onClick={onSelect}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
    >
      {/* Reorder arrows — hidden on mobile */}
      <div className="hidden sm:flex shrink-0 flex-col opacity-0 group-hover:opacity-100 transition-opacity">
        {onMoveUp && (
          <button
            type="button"
            className="text-muted-foreground/40 hover:text-foreground leading-none"
            onClick={(e) => { e.stopPropagation(); onMoveUp(); }}
          >
            <ChevronUp className="h-3 w-3" />
          </button>
        )}
        {onMoveDown && (
          <button
            type="button"
            className="text-muted-foreground/40 hover:text-foreground leading-none"
            onClick={(e) => { e.stopPropagation(); onMoveDown(); }}
          >
            <ChevronDown className="h-3 w-3" />
          </button>
        )}
      </div>
      <FileText className="h-4 w-4 shrink-0 text-muted-foreground/40" />
      {sop.isUnread && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
      {sop.pinned && <Pin className="h-3 w-3 shrink-0 text-amber-400" />}
      <span className="min-w-0 truncate max-w-[20ch] sm:max-w-[35ch]">
        {sop.title}
      </span>
      <Badge
        variant="secondary"
        className={cn("shrink-0 text-[10px] leading-none px-1.5 py-0.5", STATUS_COLORS[sop.status])}
      >
        {sop.status}
      </Badge>
      {sop.tags?.slice(0, 1).map((tag) => (
        <span key={tag} className="hidden shrink-0 text-[10px] text-muted-foreground lg:inline">
          #{tag}
        </span>
      ))}
      <div className="flex-1" />
      {/* Hover actions */}
      <div className="flex shrink-0 items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          title="Edit"
          className="rounded p-0.5 text-muted-foreground hover:text-foreground"
          onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/sops/${sop.id}/edit`); }}
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          title={sop.pinned ? "Unpin" : "Pin"}
          className="rounded p-0.5 text-muted-foreground hover:text-foreground"
          onClick={(e) => { e.stopPropagation(); onPin(sop.id, !sop.pinned); }}
        >
          <Pin className={cn("h-3.5 w-3.5", sop.pinned && "text-amber-400")} />
        </button>
        <button
          type="button"
          title="Delete"
          className="rounded p-0.5 text-muted-foreground hover:text-destructive"
          onClick={(e) => { e.stopPropagation(); onDelete(sop.id); }}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">
        {formatShortDate(sop.updated_at || sop.created_at)}
      </span>
      <span className="shrink-0 font-mono text-[10px] text-muted-foreground">v{sop.version}</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex h-5 w-5 items-center justify-center rounded opacity-0 group-hover:opacity-100 hover:bg-muted transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/sops/${sop.id}/edit`); }}>
            <Pencil className="mr-2 h-3 w-3" /> Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onPin(sop.id, !sop.pinned); }}>
            <Pin className="mr-2 h-3 w-3" /> {sop.pinned ? "Unpin" : "Pin"}
          </DropdownMenuItem>
          {folders.length > 0 && (
            <>
              {folders.slice(0, 8).map((f) => (
                <DropdownMenuItem key={f.id} onClick={(e) => { e.stopPropagation(); onMove(sop.id, f.id); }}>
                  <FolderInput className="mr-2 h-3 w-3" /> {f.name}
                </DropdownMenuItem>
              ))}
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(sop.id); }}>
            <Trash2 className="mr-2 h-3 w-3" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
