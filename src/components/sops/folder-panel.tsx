"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Folder, FileText, Trash2, FolderPlus, ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FolderRow } from "@/types/sops";

interface FolderPanelProps {
  folders: FolderRow[];
  rootFolders: FolderRow[];
  folderCounts: Record<string, number>;
  unfiledCount: number;
  trashedCount: number;
  selectedFolder: string | null;
  dragOverFolder: string | null;
  isCreatingFolder: boolean;
  newFolderName: string;
  onSelectFolder: (folderId: string | null) => void;
  onFolderContextMenu: (e: React.MouseEvent, folderId: string) => void;
  onDragOver: (folderId: string) => void;
  onDragLeave: () => void;
  onDrop: (folderId: string, e: React.DragEvent) => void;
  onFolderMoveUp: (folderId: string) => void;
  onFolderMoveDown: (folderId: string) => void;
  onSetIsCreatingFolder: (v: boolean) => void;
  onSetNewFolderName: (v: string) => void;
  onCreateFolder: (name: string) => void;
  onRenameFolder?: (folderId: string) => void;
}

export function FolderPanel({
  rootFolders,
  folderCounts,
  unfiledCount,
  trashedCount,
  selectedFolder,
  dragOverFolder,
  isCreatingFolder,
  newFolderName,
  onSelectFolder,
  onFolderContextMenu,
  onDragOver,
  onDragLeave,
  onDrop,
  onFolderMoveUp,
  onFolderMoveDown,
  onSetIsCreatingFolder,
  onSetNewFolderName,
  onCreateFolder,
  onRenameFolder,
}: FolderPanelProps) {
  const newFolderInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex w-full lg:w-64 shrink-0 flex-col border-r bg-card h-full">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Folders
        </span>
      </div>
      <div className="flex-1 overflow-y-auto py-1">
        {rootFolders.map((f, idx) => (
          <div
            key={f.id}
            data-has-context-menu
            className={cn(
              "group/folder flex w-full items-center gap-1 px-2 py-1.5 text-sm transition-colors duration-100 cursor-pointer",
              selectedFolder === f.id
                ? "bg-primary/10 text-primary"
                : "text-foreground hover:bg-muted/50",
              dragOverFolder === f.id && "ring-2 ring-primary bg-primary/10"
            )}
            onClick={() => onSelectFolder(f.id)}
            onDoubleClick={(e) => { e.stopPropagation(); onRenameFolder?.(f.id); }}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onFolderContextMenu(e, f.id);
            }}
            onDragOver={(e) => { e.preventDefault(); onDragOver(f.id); }}
            onDragLeave={() => onDragLeave()}
            onDrop={(e) => onDrop(f.id, e)}
          >
            {/* Reorder arrows */}
            <div className="flex shrink-0 flex-col opacity-0 group-hover/folder:opacity-100 transition-opacity">
              {idx > 0 && (
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={(e) => { e.stopPropagation(); onFolderMoveUp(f.id); }}
                >
                  <ChevronUp className="h-3 w-3" />
                </button>
              )}
              {idx < rootFolders.length - 1 && (
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={(e) => { e.stopPropagation(); onFolderMoveDown(f.id); }}
                >
                  <ChevronDown className="h-3 w-3" />
                </button>
              )}
            </div>
            <Folder className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate">{f.name}</span>
            <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
              {folderCounts[f.id] ?? 0}
            </span>
          </div>
        ))}
        {unfiledCount > 0 && (
          <button
            type="button"
            onClick={() => onSelectFolder("unfiled")}
            className={cn(
              "flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors duration-100",
              selectedFolder === "unfiled"
                ? "bg-primary/10 text-primary"
                : "text-foreground hover:bg-muted/50"
            )}
          >
            <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate">Unfiled</span>
            <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
              {unfiledCount}
            </span>
          </button>
        )}

        {/* Trash */}
        {trashedCount > 0 && (
          <>
            <div className="mx-3 my-1 h-px bg-border/50" />
            <button
              type="button"
              onClick={() => onSelectFolder("trash")}
              className={cn(
                "flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors duration-100",
                selectedFolder === "trash"
                  ? "bg-destructive/10 text-destructive"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
            >
              <Trash2 className="h-4 w-4 shrink-0" />
              <span className="min-w-0 flex-1 truncate">Trash</span>
              <span className="shrink-0 text-xs tabular-nums">{trashedCount}</span>
            </button>
          </>
        )}
      </div>
      <div className="border-t p-2">
        {isCreatingFolder ? (
          <form
            onSubmit={(e) => { e.preventDefault(); onCreateFolder(newFolderName); }}
            className="flex items-center gap-1"
          >
            <Input
              ref={newFolderInputRef}
              value={newFolderName}
              onChange={(e) => onSetNewFolderName(e.target.value)}
              placeholder="Folder name"
              className="h-7 text-xs"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  onSetIsCreatingFolder(false);
                  onSetNewFolderName("");
                }
              }}
              onBlur={() => {
                if (!newFolderName.trim()) {
                  onSetIsCreatingFolder(false);
                  onSetNewFolderName("");
                }
              }}
            />
          </form>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-muted-foreground"
            onClick={() => {
              onSetIsCreatingFolder(true);
              setTimeout(() => newFolderInputRef.current?.focus(), 10);
            }}
          >
            <FolderPlus className="h-4 w-4" /> New Folder
          </Button>
        )}
      </div>
    </div>
  );
}
