"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, FileText, Search, ChevronRight, Pin, Trash2, Folder } from "lucide-react";
import type { SOP, FolderRow } from "@/types/sops";
import { SopRow } from "@/components/sops/sop-row";

interface SopListProps {
  currentFolderName: string;
  folderPath?: { id: string; name: string }[];
  selectedFolder: string | null;
  onSelectFolder?: (id: string) => void;
  isTrashView: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  loading: boolean;
  displaySops: SOP[];
  pinnedSops: SOP[];
  unpinnedSops: SOP[];
  trashedSopsCount: number;
  totalSopsCount?: number;
  router: ReturnType<typeof useRouter>;
  onPin: (id: string, pinned: boolean) => void;
  onDelete: (id: string) => void;
  folders: FolderRow[];
  onMove: (sopId: string, folderId: string) => void;
  onSopMoveUp: (sopId: string) => void;
  onSopMoveDown: (sopId: string) => void;
  onContextMenu: (e: React.MouseEvent, sop: SOP) => void;
  onEmptyTrash: () => void;
  onOpenMobileFolders?: () => void;
}

export function SopList({
  currentFolderName,
  folderPath,
  selectedFolder,
  onSelectFolder,
  isTrashView,
  searchQuery,
  onSearchChange,
  loading,
  displaySops,
  pinnedSops,
  unpinnedSops,
  trashedSopsCount,
  totalSopsCount = 0,
  router,
  onPin,
  onDelete,
  folders,
  onMove,
  onSopMoveUp,
  onSopMoveDown,
  onContextMenu,
  onEmptyTrash,
  onOpenMobileFolders,
}: SopListProps) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 border-b px-3 py-2 lg:px-4 lg:gap-3">
        {onOpenMobileFolders && (
          <button type="button" className="lg:hidden shrink-0 rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted" onClick={onOpenMobileFolders}>
            <Folder className="h-4 w-4" />
          </button>
        )}
        <div className="flex items-center gap-1 text-sm text-muted-foreground min-w-0">
          <button type="button" className="hidden sm:inline hover:text-foreground transition-colors" onClick={() => onSelectFolder?.("")}>Wiki</button>
          {folderPath && folderPath.length > 0 ? (
            folderPath.map((f, i) => (
              <span key={f.id} className="flex items-center gap-1 min-w-0">
                <ChevronRight className="h-3 w-3 shrink-0" />
                {i === folderPath.length - 1 ? (
                  <span className="text-foreground font-medium truncate">{f.name}</span>
                ) : (
                  <button type="button" className="truncate hover:text-foreground transition-colors" onClick={() => onSelectFolder?.(f.id)}>{f.name}</button>
                )}
              </span>
            ))
          ) : (
            <>
              <ChevronRight className="h-3 w-3 hidden sm:block shrink-0" />
              <span className="text-foreground font-medium truncate">{currentFolderName}</span>
            </>
          )}
        </div>
        <div className="flex-1" />
        {isTrashView ? (
          trashedSopsCount > 0 && (
            <Button size="sm" variant="destructive" onClick={onEmptyTrash}>
              <Trash2 className="mr-1 h-3.5 w-3.5" /> Empty Trash
            </Button>
          )
        ) : (
          <>
            <div className="relative hidden sm:block w-48">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="h-8 pl-8 text-sm"
              />
            </div>
            <Link
              href={
                selectedFolder && selectedFolder !== "unfiled"
                  ? `/dashboard/sops/new?folder=${selectedFolder}`
                  : "/dashboard/sops/new"
              }
            >
              <Button size="sm" className="shrink-0 active:scale-[0.98]">
                <Plus className="h-3.5 w-3.5 sm:mr-1" />
                <span className="hidden sm:inline">New SOP</span>
              </Button>
            </Link>
          </>
        )}
      </div>

      {/* Document list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="space-y-px p-1">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-9 animate-pulse rounded bg-muted/30" />
            ))}
          </div>
        ) : !selectedFolder ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
            <span className="hidden lg:inline">Select a folder from the left panel</span>
            <span className="lg:hidden">Tap the folder icon to select a folder</span>
          </div>
        ) : displaySops.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <FileText className="h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm font-medium text-foreground">
              {searchQuery ? "No SOPs match your search" : totalSopsCount === 0 ? "No documents yet" : "This folder is empty"}
            </p>
            {!searchQuery && (
              <>
                {totalSopsCount === 0 && (
                  <p className="text-xs text-muted-foreground">Create your first SOP to get started.</p>
                )}
                <Link
                  href={`/dashboard/sops/new${selectedFolder && selectedFolder !== "unfiled" ? `?folder=${selectedFolder}` : ""}`}
                >
                  <Button size="sm" variant="outline">
                    <Plus className="mr-1 h-3.5 w-3.5" /> Create SOP
                  </Button>
                </Link>
              </>
            )}
          </div>
        ) : (
          <div>
            {pinnedSops.length > 0 && (
              <>
                <div className="flex items-center gap-1.5 px-4 py-1 text-[11px] text-muted-foreground">
                  <Pin className="h-3 w-3 text-amber-400" /> Pinned
                </div>
                {pinnedSops.map((sop) => (
                  <SopRow
                    key={`pin-${sop.id}`}
                    sop={sop}
                    isSelected={false}
                    onClick={() => router.push(`/dashboard/sops/${sop.id}`)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onContextMenu(e, sop);
                    }}
                    router={router}
                    onPin={onPin}
                    onDelete={onDelete}
                    folders={folders}
                    onMove={onMove}
                  />
                ))}
                {unpinnedSops.length > 0 && <div className="mx-4 my-0.5 h-px bg-border/50" />}
              </>
            )}
            {unpinnedSops.map((sop, idx) => (
              <SopRow
                key={sop.id}
                sop={sop}
                isSelected={false}
                onClick={() => router.push(`/dashboard/sops/${sop.id}`)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onContextMenu(e, sop);
                }}
                router={router}
                onPin={onPin}
                onDelete={onDelete}
                folders={folders}
                onMove={onMove}
                onMoveUp={idx > 0 ? () => onSopMoveUp(sop.id) : undefined}
                onMoveDown={idx < unpinnedSops.length - 1 ? () => onSopMoveDown(sop.id) : undefined}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
