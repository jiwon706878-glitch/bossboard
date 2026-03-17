"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useBusinessStore } from "@/hooks/use-business";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useSops } from "@/hooks/use-sops";
import { useFolders } from "@/hooks/use-folders";
import { SOPContextMenu } from "@/components/sops/sop-context-menu";
import { FolderContextMenu } from "@/components/sops/folder-context-menu";
import { FolderPanel } from "@/components/sops/folder-panel";
import { TrashView } from "@/components/sops/trash-view";
import { SopList } from "@/components/sops/sop-list";
import { Folder } from "lucide-react";
import { toast } from "sonner";
import type { SOP } from "@/types/sops";

export default function SOPsPage() {
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; sop: SOP } | null>(null);
  const [folderCtxMenu, setFolderCtxMenu] = useState<{ x: number; y: number; folderId: string } | null>(null);
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"updated" | "title">("updated");
  const [newFolderName, setNewFolderName] = useState("");
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [deleteForeverOpen, setDeleteForeverOpen] = useState(false);
  const [deleteForeverId, setDeleteForeverId] = useState<string | null>(null);
  const [emptyTrashOpen, setEmptyTrashOpen] = useState(false);
  const [mobileFolderOpen, setMobileFolderOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const supabase = createClient();
  const currentBusiness = useBusinessStore((s) => s.currentBusiness);
  const router = useRouter();
  const sops = useSops(currentBusiness?.id);
  const foldersHook = useFolders(currentBusiness?.id);

  const fetchData = useCallback(async () => {
    if (!currentBusiness) return;
    const [, allFolders] = await Promise.all([sops.fetchSops(), foldersHook.fetchFolders()]);
    if (!selectedFolder && allFolders && allFolders.length > 0) {
      const roots = allFolders.filter((f) => !f.parent_id);
      if (roots.length > 0) setSelectedFolder(roots[0].id);
    }
  }, [currentBusiness, sops.fetchSops, foldersHook.fetchFolders]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const onCreateFolder = (e: Event) => { const name = (e as CustomEvent).detail; if (name && currentBusiness?.id) handleCreateFolder(name); };
    const onSort = (e: Event) => { const s = (e as CustomEvent).detail; if (s === "title" || s === "updated") setSortBy(s); };
    const onRefresh = () => { fetchData(); };
    window.addEventListener("create-folder", onCreateFolder);
    window.addEventListener("wiki-sort", onSort);
    window.addEventListener("wiki-refresh", onRefresh);
    return () => { window.removeEventListener("create-folder", onCreateFolder); window.removeEventListener("wiki-sort", onSort); window.removeEventListener("wiki-refresh", onRefresh); };
  }, [currentBusiness?.id, fetchData]);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const isInputFocused = document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLTextAreaElement;
      // Ctrl+K / Cmd+K -> focus search
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        const searchInput = document.querySelector<HTMLInputElement>('input[placeholder="Search..."]');
        searchInput?.focus();
      }
      // Ctrl+N / Cmd+N -> new SOP
      if ((e.ctrlKey || e.metaKey) && e.key === "n") {
        e.preventDefault();
        router.push(selectedFolder && selectedFolder !== "unfiled" && selectedFolder !== "trash"
          ? `/dashboard/sops/new?folder=${selectedFolder}`
          : "/dashboard/sops/new");
      }
      // Escape -> close modals/menus
      if (e.key === "Escape") {
        setCtxMenu(null);
        setFolderCtxMenu(null);
        setDeleteForeverOpen(false);
        setEmptyTrashOpen(false);
        setMobileFolderOpen(false);
        setShortcutsOpen(false);
      }
      // ? -> show shortcuts help
      if (e.key === "?" && !isInputFocused) {
        setShortcutsOpen(true);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router, selectedFolder]);

  // Derived state
  const rootFolders = foldersHook.folders.filter((f) => !f.parent_id);
  const folderCounts: Record<string, number> = {};
  let unfiledCount = 0;
  for (const s of sops.allSops) { if (s.folder_id) folderCounts[s.folder_id] = (folderCounts[s.folder_id] ?? 0) + 1; else unfiledCount++; }

  let displaySops = sops.allSops;
  if (selectedFolder === "unfiled") displaySops = sops.allSops.filter((s) => !s.folder_id);
  else if (selectedFolder && selectedFolder !== "trash") displaySops = sops.allSops.filter((s) => s.folder_id === selectedFolder);
  if (searchQuery && selectedFolder !== "trash") { const q = searchQuery.toLowerCase(); displaySops = displaySops.filter((s) => s.title.toLowerCase().includes(q) || s.summary?.toLowerCase().includes(q) || s.tags?.some((t) => t.toLowerCase().includes(q))); }

  const sortedDisplay = [...displaySops].sort((a, b) => sortBy === "title" ? a.title.localeCompare(b.title) : new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  const pinnedSops = sortedDisplay.filter((s) => s.pinned);
  const unpinnedSops = sortedDisplay.filter((s) => !s.pinned);
  const currentFolderName = selectedFolder === "unfiled" ? "Unfiled" : selectedFolder === "trash" ? "Trash" : foldersHook.folders.find((f) => f.id === selectedFolder)?.name ?? "All Documents";

  // Coordinated actions
  async function handleCreateFolder(name: string) {
    const newId = await foldersHook.handleCreateFolder(name);
    setIsCreatingFolder(false); setNewFolderName("");
    await foldersHook.fetchFolders();
    if (newId) setSelectedFolder(newId);
  }
  async function handleDeleteFolder(folderId: string) {
    sops.setAllSops((prev) => prev.map((s) => s.folder_id === folderId ? { ...s, folder_id: null } : s));
    await supabase.from("sops").update({ folder_id: null }).eq("folder_id", folderId);
    await foldersHook.handleDeleteFolder(folderId);
    if (selectedFolder === folderId) setSelectedFolder("unfiled");
    toast.success("Folder deleted. SOPs moved to Unfiled.");
  }
  function handleDropOnFolder(folderId: string, e: React.DragEvent) {
    setDragOverFolder(null);
    foldersHook.handleDropOnFolder(folderId, e, sops.setAllSops, sops.fetchSops);
  }
  function handleMove(sopId: string, folderId: string) {
    sops.handleMove(sopId, folderId, foldersHook.folders.find((f) => f.id === folderId)?.name);
  }
  async function handleDeleteForeverConfirmed(sopId: string) { await sops.handleDeleteForever(sopId); setDeleteForeverOpen(false); setDeleteForeverId(null); }
  async function handleEmptyTrashConfirmed() { await sops.handleEmptyTrash(); setEmptyTrashOpen(false); }

  const isTrashView = selectedFolder === "trash";

  return (
    <div className="-m-4 lg:-m-6 flex h-[calc(100vh-4rem)] overflow-hidden">
      {ctxMenu && (
        <SOPContextMenu menu={ctxMenu} onClose={() => setCtxMenu(null)}
          onOpen={() => { router.push(`/dashboard/sops/${ctxMenu.sop.id}`); setCtxMenu(null); }}
          onEdit={() => { router.push(`/dashboard/sops/${ctxMenu.sop.id}/edit`); setCtxMenu(null); }}
          onPin={() => { sops.handlePin(ctxMenu.sop.id, !ctxMenu.sop.pinned); setCtxMenu(null); }}
          onDuplicate={() => { sops.handleDuplicate(ctxMenu.sop.id); setCtxMenu(null); }}
          onDelete={() => { sops.handleDelete(ctxMenu.sop.id); setCtxMenu(null); }}
          onMove={(fid) => { handleMove(ctxMenu.sop.id, fid); setCtxMenu(null); }}
          folders={foldersHook.folders} isPinned={ctxMenu.sop.pinned} />
      )}
      {folderCtxMenu && (
        <FolderContextMenu menu={folderCtxMenu} onClose={() => setFolderCtxMenu(null)}
          onRename={() => { foldersHook.handleRenameFolder(folderCtxMenu.folderId); setFolderCtxMenu(null); }}
          onDelete={() => { handleDeleteFolder(folderCtxMenu.folderId); setFolderCtxMenu(null); }}
          onNewSop={() => { router.push(`/dashboard/sops/new?folder=${folderCtxMenu.folderId}`); setFolderCtxMenu(null); }} />
      )}

      <Dialog open={deleteForeverOpen} onOpenChange={setDeleteForeverOpen}>
        <DialogContent><DialogHeader><DialogTitle>Delete Forever</DialogTitle><DialogDescription>This SOP will be permanently deleted. This action cannot be undone.</DialogDescription></DialogHeader>
          <DialogFooter><Button variant="outline" onClick={() => { setDeleteForeverOpen(false); setDeleteForeverId(null); }}>Cancel</Button><Button variant="destructive" onClick={() => deleteForeverId && handleDeleteForeverConfirmed(deleteForeverId)}>Delete Forever</Button></DialogFooter></DialogContent>
      </Dialog>
      <Dialog open={emptyTrashOpen} onOpenChange={setEmptyTrashOpen}>
        <DialogContent><DialogHeader><DialogTitle>Empty Trash</DialogTitle><DialogDescription>All {sops.trashedSops.length} trashed SOPs will be permanently deleted. This action cannot be undone.</DialogDescription></DialogHeader>
          <DialogFooter><Button variant="outline" onClick={() => setEmptyTrashOpen(false)}>Cancel</Button><Button variant="destructive" onClick={handleEmptyTrashConfirmed}>Empty Trash</Button></DialogFooter></DialogContent>
      </Dialog>

      {/* Desktop folder panel */}
      <div className="hidden lg:flex lg:shrink-0">
        <FolderPanel folders={foldersHook.folders} rootFolders={rootFolders} folderCounts={folderCounts} unfiledCount={unfiledCount}
          trashedCount={sops.trashedSops.length} selectedFolder={selectedFolder} dragOverFolder={dragOverFolder}
          isCreatingFolder={isCreatingFolder} newFolderName={newFolderName}
          onSelectFolder={(id) => { setSelectedFolder(id); }}
          onFolderContextMenu={(e, fid) => setFolderCtxMenu({ x: e.clientX, y: e.clientY, folderId: fid })}
          onDragOver={(fid) => setDragOverFolder(fid)} onDragLeave={() => setDragOverFolder(null)} onDrop={handleDropOnFolder}
          onFolderMoveUp={foldersHook.handleFolderMoveUp} onFolderMoveDown={foldersHook.handleFolderMoveDown}
          onSetIsCreatingFolder={setIsCreatingFolder} onSetNewFolderName={setNewFolderName} onCreateFolder={handleCreateFolder}
          onRenameFolder={foldersHook.handleRenameFolder} />
      </div>

      {/* Mobile folder panel in Sheet */}
      <Sheet open={mobileFolderOpen} onOpenChange={setMobileFolderOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <SheetTitle className="sr-only">Folders</SheetTitle>
          <FolderPanel folders={foldersHook.folders} rootFolders={rootFolders} folderCounts={folderCounts} unfiledCount={unfiledCount}
            trashedCount={sops.trashedSops.length} selectedFolder={selectedFolder} dragOverFolder={dragOverFolder}
            isCreatingFolder={isCreatingFolder} newFolderName={newFolderName}
            onSelectFolder={(id) => { setSelectedFolder(id); setMobileFolderOpen(false); }}
            onFolderContextMenu={(e, fid) => setFolderCtxMenu({ x: e.clientX, y: e.clientY, folderId: fid })}
            onDragOver={(fid) => setDragOverFolder(fid)} onDragLeave={() => setDragOverFolder(null)} onDrop={handleDropOnFolder}
            onFolderMoveUp={foldersHook.handleFolderMoveUp} onFolderMoveDown={foldersHook.handleFolderMoveDown}
            onSetIsCreatingFolder={setIsCreatingFolder} onSetNewFolderName={setNewFolderName} onCreateFolder={handleCreateFolder}
            onRenameFolder={foldersHook.handleRenameFolder} />
        </SheetContent>
      </Sheet>

      {isTrashView ? (
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex items-center gap-2 border-b px-4 py-2">
            <button type="button" className="lg:hidden shrink-0 rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted" onClick={() => setMobileFolderOpen(true)}><Folder className="h-4 w-4" /></button>
            <div className="flex items-center gap-1 text-sm text-muted-foreground"><span>Wiki</span><span className="text-foreground font-medium">Trash</span></div>
            <div className="flex-1" />
            {sops.trashedSops.length > 0 && <Button size="sm" variant="destructive" onClick={() => setEmptyTrashOpen(true)}>Empty Trash</Button>}
          </div>
          <div className="flex-1 overflow-y-auto">
            <TrashView trashedSops={sops.trashedSops} onRestore={sops.handleRestore} onDeleteForever={(id) => { setDeleteForeverId(id); setDeleteForeverOpen(true); }} />
          </div>
        </div>
      ) : (
        <SopList currentFolderName={currentFolderName} selectedFolder={selectedFolder} isTrashView={false}
          searchQuery={searchQuery} onSearchChange={setSearchQuery} loading={sops.loading} displaySops={displaySops}
          pinnedSops={pinnedSops} unpinnedSops={unpinnedSops} trashedSopsCount={sops.trashedSops.length} totalSopsCount={sops.allSops.length}
          router={router}
          onPin={sops.handlePin} onDelete={sops.handleDelete} folders={foldersHook.folders} onMove={handleMove}
          onSopMoveUp={(id) => sops.handleSopMoveUp(id, unpinnedSops)} onSopMoveDown={(id) => sops.handleSopMoveDown(id, unpinnedSops)}
          onContextMenu={(e, sop) => setCtxMenu({ x: e.clientX, y: e.clientY, sop })} onEmptyTrash={() => setEmptyTrashOpen(true)}
          onOpenMobileFolders={() => setMobileFolderOpen(true)} />
      )}

      {/* Keyboard shortcuts help */}
      <button
        type="button"
        onClick={() => setShortcutsOpen(true)}
        className="fixed bottom-4 left-4 z-40 flex h-8 w-8 items-center justify-center rounded-full border bg-card text-muted-foreground hover:text-foreground hover:bg-muted text-xs font-mono shadow-sm"
      >
        ?
      </button>
      <Dialog open={shortcutsOpen} onOpenChange={setShortcutsOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Keyboard Shortcuts</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            {[
              ["Ctrl+K", "Focus search"],
              ["Ctrl+N", "New SOP"],
              ["Ctrl+Z", "Undo delete"],
              ["Escape", "Close modal"],
              ["?", "Shortcuts"],
            ].map(([key, desc]) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-muted-foreground">{desc}</span>
                <kbd className="rounded border bg-muted px-2 py-0.5 font-mono text-xs">{key}</kbd>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
