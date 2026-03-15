"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useBusinessStore } from "@/hooks/use-business";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, FileText, Search, Folder, ChevronRight, Pin, MoreHorizontal, Pencil, Trash2, FolderInput, FolderPlus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface SOP {
  id: string;
  title: string;
  summary: string | null;
  category: string | null;
  status: string;
  version: number;
  folder_id: string | null;
  doc_type: string;
  tags: string[];
  pinned: boolean;
  created_at: string;
  updated_at: string;
  isUnread?: boolean;
}

interface FolderRow {
  id: string;
  name: string;
  parent_id: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  published: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  archived: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ── Context menu ──────────────────────────────────────────────────────────────

function SOPContextMenu({
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
}: {
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
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h1 = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    const h2 = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", h1);
    document.addEventListener("keydown", h2);
    return () => { document.removeEventListener("mousedown", h1); document.removeEventListener("keydown", h2); };
  }, [onClose]);

  const cls = "flex w-full items-center gap-2 rounded-sm px-3 py-1.5 text-xs cursor-pointer hover:bg-muted text-foreground";
  return (
    <div ref={ref} className="fixed z-50 w-48 rounded-md border bg-popover p-1 shadow-md" style={{ left: Math.min(menu.x, window.innerWidth - 200), top: Math.min(menu.y, window.innerHeight - 260) }}>
      <button type="button" className={cls} onClick={onOpen}><FileText className="h-3 w-3" /> Open</button>
      <button type="button" className={cls} onClick={onEdit}><Pencil className="h-3 w-3" /> Edit</button>
      <div className="my-1 h-px bg-border" />
      {folders.slice(0, 6).map((f) => (
        <button key={f.id} type="button" className={cls} onClick={() => onMove(f.id)}><FolderInput className="h-3 w-3" /> {f.name}</button>
      ))}
      <div className="my-1 h-px bg-border" />
      <button type="button" className={cls} onClick={onPin}><Pin className="h-3 w-3" /> {isPinned ? "Unpin" : "Pin"}</button>
      <button type="button" className={cls} onClick={onDuplicate}><FileText className="h-3 w-3" /> Duplicate</button>
      <div className="my-1 h-px bg-border" />
      <button type="button" className="flex w-full items-center gap-2 rounded-sm px-3 py-1.5 text-xs cursor-pointer hover:bg-destructive/10 text-destructive" onClick={onDelete}><Trash2 className="h-3 w-3" /> Delete</button>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SOPsPage() {
  const [allSops, setAllSops] = useState<SOP[]>([]);
  const [folders, setFolders] = useState<FolderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [selectedSopId, setSelectedSopId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; sop: SOP } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; timer: ReturnType<typeof setTimeout> } | null>(null);
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"updated" | "title">("updated");

  const supabase = createClient();
  const currentBusiness = useBusinessStore((s) => s.currentBusiness);
  const router = useRouter();

  // ── Data fetching ─────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    if (!currentBusiness) return;
    setLoading(true);

    const [{ data: allFolders }, { data: sopsData }] = await Promise.all([
      supabase.from("folders").select("id, name, parent_id").eq("business_id", currentBusiness.id),
      supabase.from("sops")
        .select("id, title, summary, category, status, version, folder_id, doc_type, tags, pinned, created_at, updated_at")
        .eq("business_id", currentBusiness.id)
        .order("updated_at", { ascending: false }),
    ]);

    setFolders(allFolders ?? []);

    // Mark unread
    const { data: { user } } = await supabase.auth.getUser();
    if (user && sopsData && sopsData.length > 0) {
      const { data: reads } = await supabase.from("sop_reads").select("sop_id").eq("user_id", user.id).in("sop_id", sopsData.map((s) => s.id));
      const readIds = new Set((reads ?? []).map((r) => r.sop_id));
      setAllSops(sopsData.map((s) => ({ ...s, isUnread: !readIds.has(s.id) })));
    } else {
      setAllSops(sopsData ?? []);
    }

    // Auto-select first folder
    if (!selectedFolder && allFolders && allFolders.length > 0) {
      const roots = allFolders.filter((f) => !f.parent_id);
      if (roots.length > 0) setSelectedFolder(roots[0].id);
    }

    setLoading(false);
  }, [currentBusiness, supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Listen for events from PageContextMenu
  useEffect(() => {
    function onCreateFolder(e: Event) {
      const name = (e as CustomEvent).detail;
      if (name && currentBusiness?.id) handleCreateFolder(name);
    }
    function onSort(e: Event) {
      const sort = (e as CustomEvent).detail;
      if (sort === "title" || sort === "updated") setSortBy(sort);
    }
    function onRefresh() { fetchData(); }
    window.addEventListener("create-folder", onCreateFolder);
    window.addEventListener("wiki-sort", onSort);
    window.addEventListener("wiki-refresh", onRefresh);
    return () => {
      window.removeEventListener("create-folder", onCreateFolder);
      window.removeEventListener("wiki-sort", onSort);
      window.removeEventListener("wiki-refresh", onRefresh);
    };
  }, [currentBusiness?.id, fetchData]);

  // ── Folder computations ───────────────────────────────────────────────────

  const rootFolders = folders.filter((f) => !f.parent_id);
  const folderCounts: Record<string, number> = {};
  let unfiledCount = 0;
  for (const s of allSops) {
    if (s.folder_id) folderCounts[s.folder_id] = (folderCounts[s.folder_id] ?? 0) + 1;
    else unfiledCount++;
  }

  // ── Filtered SOPs for right panel ─────────────────────────────────────────

  let displaySops = allSops;
  if (selectedFolder === "unfiled") {
    displaySops = allSops.filter((s) => !s.folder_id);
  } else if (selectedFolder) {
    displaySops = allSops.filter((s) => s.folder_id === selectedFolder);
  }

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    displaySops = displaySops.filter((s) =>
      s.title.toLowerCase().includes(q) ||
      s.summary?.toLowerCase().includes(q) ||
      s.tags?.some((t) => t.toLowerCase().includes(q))
    );
  }

  // Sort
  const sortedDisplay = [...displaySops].sort((a, b) => {
    if (sortBy === "title") return a.title.localeCompare(b.title);
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });

  const pinnedSops = sortedDisplay.filter((s) => s.pinned);
  const unpinnedSops = sortedDisplay.filter((s) => !s.pinned);

  const currentFolderName = selectedFolder === "unfiled"
    ? "Unfiled"
    : folders.find((f) => f.id === selectedFolder)?.name ?? "All Documents";

  // ── Actions ───────────────────────────────────────────────────────────────

  async function handlePin(sopId: string, pinned: boolean) {
    await supabase.from("sops").update({ pinned }).eq("id", sopId);
    fetchData();
  }

  function handleDelete(sopId: string) {
    setAllSops((prev) => prev.filter((s) => s.id !== sopId));
    if (pendingDelete) clearTimeout(pendingDelete.timer);
    const timer = setTimeout(async () => { await supabase.from("sops").delete().eq("id", sopId); setPendingDelete(null); }, 5000);
    setPendingDelete({ id: sopId, timer });
    toast.success("SOP deleted", { action: { label: "Undo", onClick: () => { clearTimeout(timer); setPendingDelete(null); fetchData(); } }, duration: 5000 });
  }

  async function handleMove(sopId: string, folderId: string) {
    await supabase.from("sops").update({ folder_id: folderId }).eq("id", sopId);
    toast.success(`Moved to ${folders.find((f) => f.id === folderId)?.name ?? "folder"}`);
    fetchData();
  }

  async function handleDuplicate(sopId: string) {
    if (!currentBusiness?.id) return;
    const { data: full } = await supabase.from("sops").select("*").eq("id", sopId).single();
    if (!full) return;
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("sops").insert({ business_id: currentBusiness.id, title: full.title + " (Copy)", content: full.content, summary: full.summary, category: full.category, folder_id: full.folder_id, doc_type: full.doc_type, tags: full.tags, status: "draft", version: 1, created_by: user?.id });
    fetchData();
  }

  async function handleCreateFolder(name: string) {
    if (!currentBusiness?.id) return;
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("folders").insert({ business_id: currentBusiness.id, name, parent_id: null, sort_order: folders.length, created_by: user?.id });
    toast.success(`Folder "${name}" created`);
    fetchData();
  }

  async function handleDropOnFolder(folderId: string, e: React.DragEvent) {
    e.preventDefault();
    setDragOverFolder(null);
    const sopId = e.dataTransfer.getData("text/plain");
    if (!sopId) return;
    await supabase.from("sops").update({ folder_id: folderId }).eq("id", sopId);
    toast.success("SOP moved");
    fetchData();
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="-m-4 lg:-m-6 flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Context menu */}
      {ctxMenu && (
        <SOPContextMenu
          menu={ctxMenu}
          onClose={() => setCtxMenu(null)}
          onOpen={() => { router.push(`/dashboard/sops/${ctxMenu.sop.id}`); setCtxMenu(null); }}
          onEdit={() => { router.push(`/dashboard/sops/${ctxMenu.sop.id}/edit`); setCtxMenu(null); }}
          onPin={() => { handlePin(ctxMenu.sop.id, !ctxMenu.sop.pinned); setCtxMenu(null); }}
          onDuplicate={() => { handleDuplicate(ctxMenu.sop.id); setCtxMenu(null); }}
          onDelete={() => { handleDelete(ctxMenu.sop.id); setCtxMenu(null); }}
          onMove={(fid) => { handleMove(ctxMenu.sop.id, fid); setCtxMenu(null); }}
          folders={folders}
          isPinned={ctxMenu.sop.pinned}
        />
      )}

      {/* ── LEFT PANEL: folder list ──────────────────────────────────────── */}
      <div className="flex w-64 shrink-0 flex-col border-r bg-card">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Folders</span>
        </div>
        <div className="flex-1 overflow-y-auto py-1">
          {rootFolders.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => { setSelectedFolder(f.id); setSelectedSopId(null); }}
              onDragOver={(e) => { e.preventDefault(); setDragOverFolder(f.id); }}
              onDragLeave={() => setDragOverFolder(null)}
              onDrop={(e) => handleDropOnFolder(f.id, e)}
              className={cn(
                "flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors duration-100",
                selectedFolder === f.id ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted/50",
                dragOverFolder === f.id && "bg-primary/10"
              )}
            >
              <Folder className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate">{f.name}</span>
              <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{folderCounts[f.id] ?? 0}</span>
            </button>
          ))}
          {unfiledCount > 0 && (
            <button
              type="button"
              onClick={() => { setSelectedFolder("unfiled"); setSelectedSopId(null); }}
              className={cn(
                "flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors duration-100",
                selectedFolder === "unfiled" ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted/50"
              )}
            >
              <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate">Unfiled</span>
              <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{unfiledCount}</span>
            </button>
          )}
        </div>
        <div className="border-t p-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-muted-foreground"
            onClick={() => { const n = prompt("New folder name:"); if (n?.trim()) handleCreateFolder(n.trim()); }}
          >
            <FolderPlus className="h-4 w-4" /> New Folder
          </Button>
        </div>
      </div>

      {/* ── RIGHT PANEL: documents ───────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 border-b px-4 py-2">
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <span>Wiki</span>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground font-medium">{currentFolderName}</span>
          </div>
          <div className="flex-1" />
          <div className="relative w-48">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-sm"
            />
          </div>
          <Link href={selectedFolder && selectedFolder !== "unfiled" ? `/dashboard/sops/new?folder=${selectedFolder}` : "/dashboard/sops/new"}>
            <Button size="sm">
              <Plus className="mr-1 h-3.5 w-3.5" /> New SOP
            </Button>
          </Link>
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
                <Link href={`/dashboard/sops/new${selectedFolder !== "unfiled" ? `?folder=${selectedFolder}` : ""}`}>
                  <Button size="sm" variant="outline"><Plus className="mr-1 h-3.5 w-3.5" /> Create SOP</Button>
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
                    <SopRow key={sop.id} sop={sop} isSelected={selectedSopId === sop.id} onSelect={() => setSelectedSopId(sop.id)} onDoubleClick={() => router.push(`/dashboard/sops/${sop.id}`)} onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setCtxMenu({ x: e.clientX, y: e.clientY, sop }); }} router={router} onPin={handlePin} onDelete={handleDelete} folders={folders} onMove={handleMove} />
                  ))}
                  {unpinnedSops.length > 0 && <div className="mx-4 my-0.5 h-px bg-border/50" />}
                </>
              )}
              {unpinnedSops.map((sop) => (
                <SopRow key={sop.id} sop={sop} isSelected={selectedSopId === sop.id} onSelect={() => setSelectedSopId(sop.id)} onDoubleClick={() => router.push(`/dashboard/sops/${sop.id}`)} onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setCtxMenu({ x: e.clientX, y: e.clientY, sop }); }} router={router} onPin={handlePin} onDelete={handleDelete} folders={folders} onMove={handleMove} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── SOP Row ───────────────────────────────────────────────────────────────────

function SopRow({
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
}: {
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
}) {
  return (
    <div
      data-has-context-menu
      className={cn(
        "group flex h-9 cursor-default items-center gap-1.5 border-b border-border/30 px-4 text-sm transition-colors duration-75",
        isSelected ? "bg-primary/5 border-l-2 border-l-primary" : "hover:bg-muted/30"
      )}
      draggable
      onDragStart={(e) => { e.dataTransfer.setData("text/plain", sop.id); e.dataTransfer.effectAllowed = "move"; }}
      onClick={onSelect}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
    >
      <FileText className="h-4 w-4 shrink-0 text-muted-foreground/40" />
      {sop.isUnread && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
      {sop.pinned && <Pin className="h-3 w-3 shrink-0 text-amber-400" />}
      <span className="min-w-0 truncate" style={{ maxWidth: "35ch" }}>{sop.title}</span>
      <Badge variant="secondary" className={cn("shrink-0 text-[10px] leading-none px-1.5 py-0.5", STATUS_COLORS[sop.status])}>{sop.status}</Badge>
      {sop.tags?.slice(0, 1).map((tag) => (
        <span key={tag} className="hidden shrink-0 text-[10px] text-muted-foreground lg:inline">#{tag}</span>
      ))}
      <div className="flex-1" />
      {/* Hover actions */}
      <div className="flex shrink-0 items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button type="button" title="Edit" className="rounded p-0.5 text-muted-foreground hover:text-foreground" onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/sops/${sop.id}/edit`); }}><Pencil className="h-3.5 w-3.5" /></button>
        <button type="button" title={sop.pinned ? "Unpin" : "Pin"} className="rounded p-0.5 text-muted-foreground hover:text-foreground" onClick={(e) => { e.stopPropagation(); onPin(sop.id, !sop.pinned); }}><Pin className={cn("h-3.5 w-3.5", sop.pinned && "text-amber-400")} /></button>
        <button type="button" title="Delete" className="rounded p-0.5 text-muted-foreground hover:text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(sop.id); }}><Trash2 className="h-3.5 w-3.5" /></button>
      </div>
      <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">{formatDate(sop.updated_at || sop.created_at)}</span>
      <span className="shrink-0 font-mono text-[10px] text-muted-foreground">v{sop.version}</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" className="flex h-5 w-5 items-center justify-center rounded opacity-0 group-hover:opacity-100 hover:bg-muted transition-opacity" onClick={(e) => e.stopPropagation()}><MoreHorizontal className="h-3.5 w-3.5" /></button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/sops/${sop.id}/edit`); }}><Pencil className="mr-2 h-3 w-3" /> Edit</DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onPin(sop.id, !sop.pinned); }}><Pin className="mr-2 h-3 w-3" /> {sop.pinned ? "Unpin" : "Pin"}</DropdownMenuItem>
          {folders.length > 0 && (
            <>{folders.slice(0, 8).map((f) => (<DropdownMenuItem key={f.id} onClick={(e) => { e.stopPropagation(); onMove(sop.id, f.id); }}><FolderInput className="mr-2 h-3 w-3" /> {f.name}</DropdownMenuItem>))}</>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(sop.id); }}><Trash2 className="mr-2 h-3 w-3" /> Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
