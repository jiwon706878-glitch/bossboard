"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, FileText, Search, ChevronRight, Pin, Trash2 } from "lucide-react";
import type { SOP, FolderRow } from "@/types/sops";
import { SopRow } from "@/components/sops/sop-row";

interface SopListProps {
  currentFolderName: string;
  selectedFolder: string | null;
  isTrashView: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  loading: boolean;
  displaySops: SOP[];
  pinnedSops: SOP[];
  unpinnedSops: SOP[];
  trashedSopsCount: number;
  selectedSopId: string | null;
  onSelectSop: (sopId: string) => void;
  router: ReturnType<typeof useRouter>;
  onPin: (id: string, pinned: boolean) => void;
  onDelete: (id: string) => void;
  folders: FolderRow[];
  onMove: (sopId: string, folderId: string) => void;
  onSopMoveUp: (sopId: string) => void;
  onSopMoveDown: (sopId: string) => void;
  onContextMenu: (e: React.MouseEvent, sop: SOP) => void;
  onEmptyTrash: () => void;
}

export function SopList({
  currentFolderName,
  selectedFolder,
  isTrashView,
  searchQuery,
  onSearchChange,
  loading,
  displaySops,
  pinnedSops,
  unpinnedSops,
  trashedSopsCount,
  selectedSopId,
  onSelectSop,
  router,
  onPin,
  onDelete,
  folders,
  onMove,
  onSopMoveUp,
  onSopMoveDown,
  onContextMenu,
  onEmptyTrash,
}: SopListProps) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 border-b px-4 py-2">
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <span>Wiki</span>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground font-medium">{currentFolderName}</span>
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
            <div className="relative w-48">
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
              <Button size="sm">
                <Plus className="mr-1 h-3.5 w-3.5" /> New SOP
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
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Select a folder from the left panel
          </div>
        ) : displaySops.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <FileText className="h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              {searchQuery ? "No SOPs match your search" : "This folder is empty"}
            </p>
            {!searchQuery && (
              <Link
                href={`/dashboard/sops/new${selectedFolder !== "unfiled" ? `?folder=${selectedFolder}` : ""}`}
              >
                <Button size="sm" variant="outline">
                  <Plus className="mr-1 h-3.5 w-3.5" /> Create SOP
                </Button>
              </Link>
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
                    key={sop.id}
                    sop={sop}
                    isSelected={selectedSopId === sop.id}
                    onSelect={() => onSelectSop(sop.id)}
                    onDoubleClick={() => router.push(`/dashboard/sops/${sop.id}`)}
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
                isSelected={selectedSopId === sop.id}
                onSelect={() => onSelectSop(sop.id)}
                onDoubleClick={() => router.push(`/dashboard/sops/${sop.id}`)}
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
