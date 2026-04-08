"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useBusinessStore } from "@/hooks/use-business";
import { markdownToTipTap } from "@/lib/markdown-to-tiptap";
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
import { cn } from "@/lib/utils";
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
  const [fileDropTarget, setFileDropTarget] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const supabase = createClient();
  const currentBusiness = useBusinessStore((s) => s.currentBusiness);
  const router = useRouter();
  const sops = useSops(currentBusiness?.id);
  const foldersHook = useFolders(currentBusiness?.id);

  const fetchData = useCallback(async () => {
    if (!currentBusiness) return;
    const [, allFolders] = await Promise.all([sops.fetchSops(), foldersHook.fetchFolders()]);
    if (!selectedFolder && allFolders && allFolders.length > 0) {
      const roots = allFolders.filter((f: any) => !f.parent_id);
      if (roots.length > 0) setSelectedFolder(roots[0].id);
    }
  }, [currentBusiness, sops.fetchSops, foldersHook.fetchFolders]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Realtime: auto-refresh when any SOP changes
  useEffect(() => {
    if (!currentBusiness?.id) return;
    const channel = supabase
      .channel("sops-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "sops", filter: `business_id=eq.${currentBusiness.id}` }, () => {
        fetchData();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentBusiness?.id, fetchData, supabase]);

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
  const folderPath = selectedFolder && selectedFolder !== "unfiled" && selectedFolder !== "trash"
    ? foldersHook.getFolderPath(selectedFolder)
    : [];

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
    toast.success("Folder deleted. Documents moved to Unfiled.");
  }
  function handleDropOnFolder(folderId: string, e: React.DragEvent) {
    setDragOverFolder(null);
    // Check if this is a file drop from the OS
    if (e.dataTransfer.types.includes("Files")) {
      const files = Array.from(e.dataTransfer.files).filter((f) => f.name.endsWith(".md") || f.name.endsWith(".txt"));
      if (files.length > 0) {
        e.preventDefault();
        for (const file of files) handleFileImport(file, folderId);
        return;
      }
    }
    foldersHook.handleDropOnFolder(folderId, e, sops.setAllSops, sops.fetchSops);
  }
  function handleMove(sopId: string, folderId: string) {
    sops.handleMove(sopId, folderId, foldersHook.folders.find((f) => f.id === folderId)?.name);
  }
  async function handleDeleteForeverConfirmed(sopId: string) { await sops.handleDeleteForever(sopId); setDeleteForeverOpen(false); setDeleteForeverId(null); }
  async function handleEmptyTrashConfirmed() { await sops.handleEmptyTrash(); setEmptyTrashOpen(false); }

  async function handleFileImport(file: File, targetFolderId: string | null) {
    if (!file.name.endsWith(".md") && !file.name.endsWith(".txt")) return;
    if (!currentBusiness?.id) return;

    const text = await file.text();
    const tiptapContent = markdownToTipTap(text);

    let docTitle = file.name.replace(/\.(md|txt)$/, "");
    const firstHeading = tiptapContent.content?.find((n: any) => n.type === "heading");
    if (firstHeading?.content?.[0]?.text) docTitle = firstHeading.content[0].text;

    const firstPara = tiptapContent.content?.find((n: any) => n.type === "paragraph" && n.content?.length > 0);
    const summary = firstPara?.content?.map((c: any) => c.text || "").join("").substring(0, 200) || null;

    const { data, error } = await supabase
      .from("sops")
      .insert({
        business_id: currentBusiness.id,
        title: docTitle.trim(),
        content: tiptapContent,
        summary,
        doc_type: "note",
        folder_id: targetFolderId && targetFolderId !== "unfiled" && targetFolderId !== "trash" ? targetFolderId : null,
        status: "published",
        version: 1,
      })
      .select("id, title")
      .single();

    if (error) { console.error("SOP import error:", error.message); toast.error("Failed to import document. Please try again."); return; }

    toast.success(`Imported "${docTitle}"`, {
      action: data ? { label: "Open", onClick: () => router.push(`/dashboard/sops/${data.id}`) } : undefined,
    });
    await sops.fetchSops();
  }

  function handleFileDrop(e: React.DragEvent, targetFolder: string | null) {
    e.preventDefault();
    setFileDropTarget(null);
    if (!e.dataTransfer.types.includes("Files")) return;
    const files = Array.from(e.dataTransfer.files).filter((f) => f.name.endsWith(".md") || f.name.endsWith(".txt"));
    if (files.length === 0) { toast.error("Only .md and .txt files are supported"); return; }
    if (files.length > 1) toast.success(`Importing ${files.length} files...`);
    for (const file of files) handleFileImport(file, targetFolder);
  }

  // Listen for file imports from folder panel
  useEffect(() => {
    function onImportEvent(e: Event) {
      const { file, folderId } = (e as CustomEvent).detail;
      handleFileImport(file, folderId);
    }
    window.addEventListener("wiki-import-file", onImportEvent);
    return () => window.removeEventListener("wiki-import-file", onImportEvent);
  }, [currentBusiness?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const isTrashView = selectedFolder === "trash";

  return (
    <div className="-m-4 lg:-m-6 flex h-[calc(100vh-4rem)] overflow-hidden animate-fade-in">
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
        <DialogContent><DialogHeader><DialogTitle>Delete Forever</DialogTitle><DialogDescription>This document will be permanently deleted. This action cannot be undone.</DialogDescription></DialogHeader>
          <DialogFooter><Button variant="outline" onClick={() => { setDeleteForeverOpen(false); setDeleteForeverId(null); }}>Cancel</Button><Button variant="destructive" onClick={() => deleteForeverId && handleDeleteForeverConfirmed(deleteForeverId)}>Delete Forever</Button></DialogFooter></DialogContent>
      </Dialog>
      <Dialog open={emptyTrashOpen} onOpenChange={setEmptyTrashOpen}>
        <DialogContent><DialogHeader><DialogTitle>Empty Trash</DialogTitle><DialogDescription>All {sops.trashedSops.length} trashed documents will be permanently deleted. This action cannot be undone.</DialogDescription></DialogHeader>
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

      <div
        className={cn("flex flex-1 flex-col overflow-hidden relative", fileDropTarget && "ring-2 ring-primary ring-inset")}
        onDragOver={(e) => { if (!e.dataTransfer.types.includes("Files")) return; e.preventDefault(); setFileDropTarget(selectedFolder || "unfiled"); }}
        onDragLeave={(e) => { e.preventDefault(); setFileDropTarget(null); }}
        onDrop={(e) => handleFileDrop(e, selectedFolder === "trash" ? null : selectedFolder)}
      >
        {fileDropTarget && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-primary/5 pointer-events-none">
            <div className="rounded-lg border-2 border-dashed border-primary px-8 py-6 text-center bg-card/80 backdrop-blur-sm">
              <p className="text-primary font-medium text-sm">Drop .md or .txt files to import</p>
              <p className="text-xs text-muted-foreground mt-1">
                {selectedFolder && selectedFolder !== "unfiled" && selectedFolder !== "trash"
                  ? `Will be added to "${currentFolderName}"`
                  : "Will be added as unfiled"}
              </p>
            </div>
          </div>
        )}
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
          <SopList currentFolderName={currentFolderName} folderPath={folderPath} selectedFolder={selectedFolder} onSelectFolder={setSelectedFolder} isTrashView={false}
            searchQuery={searchQuery} onSearchChange={setSearchQuery} loading={sops.loading} displaySops={displaySops}
            pinnedSops={pinnedSops} unpinnedSops={unpinnedSops} trashedSopsCount={sops.trashedSops.length} totalSopsCount={sops.allSops.length}
            router={router}
            onPin={sops.handlePin} onDelete={sops.handleDelete} folders={foldersHook.folders} onMove={handleMove}
            onSopMoveUp={(id) => sops.handleSopMoveUp(id, unpinnedSops)} onSopMoveDown={(id) => sops.handleSopMoveDown(id, unpinnedSops)}
            onContextMenu={(e, sop) => setCtxMenu({ x: e.clientX, y: e.clientY, sop })} onEmptyTrash={() => setEmptyTrashOpen(true)}
            onOpenMobileFolders={() => setMobileFolderOpen(true)}
            importInputRef={importInputRef}
            onImportClick={() => importInputRef.current?.click()}
          />
        )}
        <input ref={importInputRef} type="file" accept=".md,.txt" multiple className="hidden" onChange={(e) => {
          const files = Array.from(e.target.files || []);
          for (const file of files) handleFileImport(file, selectedFolder === "trash" ? null : selectedFolder);
          e.target.value = "";
        }} />
      </div>

    </div>
  );
}
