"use client";

import { useEffect, useState, useCallback, useRef, memo } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useBusinessStore } from "@/hooks/use-business";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  ChevronRight,
  ChevronDown,
  FolderOpen,
  Folder,
  FileText,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  Search,
  FolderPlus,
  FilePlus,
  ExternalLink,
  Lock,
  Shield,
} from "lucide-react";
import { toast } from "sonner";

interface FolderRow {
  id: string;
  name: string;
  parent_id: string | null;
  sort_order: number;
  permissions?: { visible_to: string[] } | null;
}

interface FolderNode extends FolderRow {
  children: FolderNode[];
  sopCount: number;
  isRestricted: boolean;
}

interface ContextMenuState {
  x: number;
  y: number;
  folderId: string;
  folderName: string;
}

const DEFAULT_FOLDERS = [
  { name: "Operations", children: [{ name: "Opening & Closing" }] },
  { name: "Recipes & Products", children: [] },
  { name: "Safety & Hygiene", children: [] },
  { name: "HR & Training", children: [] },
  { name: "Customer Service", children: [] },
];

function buildTree(folders: FolderRow[], sopCounts: Record<string, number>): FolderNode[] {
  const map = new Map<string, FolderNode>();
  const roots: FolderNode[] = [];

  for (const f of folders) {
    const visibleTo = f.permissions?.visible_to;
    const isRestricted = !!visibleTo && visibleTo.length > 0 && !visibleTo.includes("all");
    map.set(f.id, { ...f, children: [], sopCount: sopCounts[f.id] ?? 0, isRestricted });
  }

  for (const node of map.values()) {
    if (node.parent_id && map.has(node.parent_id)) {
      map.get(node.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sort = (arr: FolderNode[]) => {
    arr.sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
    arr.forEach((n) => sort(n.children));
  };
  sort(roots);
  return roots;
}

// ── Context Menu Component ──────────────────────────────────────────────────

function FolderContextMenu({
  menu,
  onClose,
  onOpen,
  onNewSop,
  onNewSubfolder,
  onRename,
  onDelete,
  onAccessControl,
}: {
  menu: ContextMenuState;
  onClose: () => void;
  onOpen: () => void;
  onNewSop: () => void;
  onNewSubfolder: () => void;
  onRename: () => void;
  onDelete: () => void;
  onAccessControl: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  // Clamp position to viewport
  const style: React.CSSProperties = {
    position: "fixed",
    left: Math.min(menu.x, window.innerWidth - 180),
    top: Math.min(menu.y, window.innerHeight - 220),
    zIndex: 50,
  };

  const itemClass =
    "flex w-full items-center gap-2 rounded-sm px-3 py-1.5 text-xs cursor-pointer transition-colors duration-100 hover:bg-muted text-foreground";
  const dangerClass =
    "flex w-full items-center gap-2 rounded-sm px-3 py-1.5 text-xs cursor-pointer transition-colors duration-100 hover:bg-destructive/10 text-destructive";

  return (
    <div
      ref={ref}
      className="w-44 rounded-md border bg-popover p-1 shadow-md"
      style={style}
    >
      <button type="button" className={itemClass} onClick={() => { onOpen(); onClose(); }}>
        <ExternalLink className="h-3 w-3" /> Open
      </button>
      <button type="button" className={itemClass} onClick={() => { onNewSop(); onClose(); }}>
        <FilePlus className="h-3 w-3" /> New SOP here
      </button>

      <div className="my-1 h-px bg-border" />

      <button type="button" className={itemClass} onClick={() => { onNewSubfolder(); onClose(); }}>
        <FolderPlus className="h-3 w-3" /> New subfolder
      </button>
      <button type="button" className={itemClass} onClick={() => { onRename(); onClose(); }}>
        <Pencil className="h-3 w-3" /> Rename
      </button>
      <button type="button" className={itemClass} onClick={() => { onAccessControl(); onClose(); }}>
        <Shield className="h-3 w-3" /> Access Control
      </button>

      <div className="my-1 h-px bg-border" />

      <button type="button" className={dangerClass} onClick={() => { onDelete(); onClose(); }}>
        <Trash2 className="h-3 w-3" /> Delete folder
      </button>
    </div>
  );
}

// ── Folder Item ─────────────────────────────────────────────────────────────

const FolderItem = memo(function FolderItem({
  node,
  depth,
  activeFolderId,
  onSelect,
  onRename,
  onDelete,
  onContextMenu,
  onDropSop,
  onDropFolder,
}: {
  node: FolderNode;
  depth: number;
  activeFolderId: string | null;
  onSelect: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onContextMenu: (e: React.MouseEvent, id: string, name: string) => void;
  onDropSop: (folderId: string, sopId: string) => void;
  onDropFolder?: (targetFolderId: string, draggedFolderId: string) => void;
}) {
  const [expanded, setExpanded] = useState(depth === 0);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(node.name);
  const [isDragOver, setIsDragOver] = useState(false);
  const hasChildren = node.children.length > 0;
  const isActive = activeFolderId === node.id;

  function handleRename() {
    if (editName.trim() && editName !== node.name) {
      onRename(node.id, editName.trim());
    }
    setEditing(false);
  }

  // Expose editing trigger via a custom attribute for context menu
  return (
    <div>
      <div
        className={cn(
          "group flex items-center gap-1 rounded-md px-1 py-1 text-sm transition-all duration-100 cursor-pointer",
          isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
          isDragOver && "ring-2 ring-primary bg-primary/10"
        )}
        style={{ paddingLeft: `${depth * 16 + 4}px` }}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onContextMenu(e, node.id, node.name);
        }}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData("text/plain", node.id);
          e.dataTransfer.setData("application/x-drag-type", "folder");
          e.dataTransfer.effectAllowed = "move";
          e.stopPropagation();
        }}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragOver(false);
          const dragType = e.dataTransfer.getData("application/x-drag-type");
          const dragId = e.dataTransfer.getData("text/plain");
          if (!dragId || dragId === node.id) return;
          if (dragType === "folder" && onDropFolder) {
            onDropFolder(node.id, dragId);
          } else {
            onDropSop(node.id, dragId);
          }
        }}
        data-folder-id={node.id}
      >
        {/* Expand toggle */}
        <button
          type="button"
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded hover:bg-muted"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
        >
          {hasChildren ? (
            expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />
          ) : (
            <span className="h-3.5 w-3.5" />
          )}
        </button>

        {/* Folder icon + name */}
        <div
          className="flex min-w-0 flex-1 items-center gap-1.5"
          onClick={() => onSelect(node.id)}
        >
          {expanded && hasChildren ? (
            <FolderOpen className="h-3.5 w-3.5 shrink-0" />
          ) : (
            <Folder className="h-3.5 w-3.5 shrink-0" />
          )}

          {editing ? (
            <form
              className="flex flex-1 items-center gap-1"
              onSubmit={(e) => { e.preventDefault(); handleRename(); }}
            >
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="h-5 text-xs px-1 py-0"
                autoFocus
                onBlur={handleRename}
                onKeyDown={(e) => e.key === "Escape" && setEditing(false)}
              />
            </form>
          ) : (
            <span className="flex items-center gap-1 truncate text-xs">
              {node.name}
              {node.isRestricted && <Lock className="h-2.5 w-2.5 shrink-0 text-muted-foreground/50" />}
            </span>
          )}
        </div>

        {/* Count */}
        {!editing && node.sopCount > 0 && (
          <span className="shrink-0 text-[10px] text-muted-foreground font-mono">
            {node.sopCount}
          </span>
        )}
      </div>

      {/* Children */}
      {expanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <FolderItem
              key={child.id}
              node={child}
              depth={depth + 1}
              activeFolderId={activeFolderId}
              onSelect={onSelect}
              onRename={onRename}
              onDelete={onDelete}
              onContextMenu={onContextMenu}
              onDropSop={onDropSop}
              onDropFolder={onDropFolder}
            />
          ))}
        </div>
      )}
    </div>
  );
});

// ── Folder Tree ─────────────────────────────────────────────────────────────

export function FolderTree() {
  const supabase = createClient();
  const { currentBusiness, setCurrentBusiness } = useBusinessStore();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeFolderId = searchParams.get("folder");

  const [tree, setTree] = useState<FolderNode[]>([]);
  const [unfiledCount, setUnfiledCount] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [creating, setCreating] = useState(false);
  const [creatingParentId, setCreatingParentId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [sidebarSearch, setSidebarSearch] = useState("");
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [accessFolderId, setAccessFolderId] = useState<string | null>(null);
  const [accessMode, setAccessMode] = useState<"all" | "selected">("all");
  const [accessUserIds, setAccessUserIds] = useState<string[]>([]);
  const [accessSaving, setAccessSaving] = useState(false);
  const [teamMembers, setTeamMembers] = useState<{ id: string; name: string }[]>([]);
  const [showCreateBusiness, setShowCreateBusiness] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [creatingBusiness, setCreatingBusiness] = useState(false);

  async function handleCreateBusiness() {
    const name = businessName.trim();
    if (!name) return;
    setCreatingBusiness(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("You must be logged in");
      setCreatingBusiness(false);
      return;
    }

    const { data, error } = await supabase
      .from("businesses")
      .insert({ user_id: user.id, name, type: "other" })
      .select()
      .single();

    if (error) {
      toast.error(error.message);
      setCreatingBusiness(false);
      return;
    }

    setCurrentBusiness(data);
    setBusinessName("");
    setShowCreateBusiness(false);
    setCreatingBusiness(false);
    toast.success(`"${name}" created`);
  }

  const loadFolders = useCallback(async () => {
    if (!currentBusiness?.id) {
      setLoaded(true);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;

    // Check if user is the business owner (admin always sees everything)
    const { data: biz } = await supabase
      .from("businesses")
      .select("user_id")
      .eq("id", currentBusiness.id)
      .single();
    const isOwner = biz?.user_id === userId;

    const [{ data: allFolders }, { data: sops }] = await Promise.all([
      supabase
        .from("folders")
        .select("id, name, parent_id, sort_order, permissions")
        .eq("business_id", currentBusiness.id)
        .order("sort_order"),
      supabase
        .from("sops")
        .select("id, folder_id")
        .eq("business_id", currentBusiness.id)
        .is("deleted_at", null),
    ]);

    if (!allFolders) {
      setLoaded(true);
      return;
    }

    // Filter folders by permissions (owner/admin sees all)
    const folders = isOwner
      ? allFolders
      : allFolders.filter((f) => {
          const visibleTo = (f.permissions as { visible_to?: string[] } | null)?.visible_to;
          if (!visibleTo || visibleTo.length === 0 || visibleTo.includes("all")) return true;
          return userId ? visibleTo.includes(userId) : false;
        });

    if (allFolders.length === 0) {
      await createDefaultFolders(currentBusiness.id);
      loadFolders();
      return;
    }

    if (folders.length === 0) {
      setTree([]);
      setLoaded(true);
      return;
    }

    const counts: Record<string, number> = {};
    let unfiled = 0;
    for (const s of sops ?? []) {
      if (s.folder_id) {
        counts[s.folder_id] = (counts[s.folder_id] ?? 0) + 1;
      } else {
        unfiled++;
      }
    }

    setTree(buildTree(folders, counts));
    setUnfiledCount(unfiled);
    setLoaded(true);
  }, [currentBusiness?.id, supabase]);

  async function createDefaultFolders(businessId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    for (let i = 0; i < DEFAULT_FOLDERS.length; i++) {
      const df = DEFAULT_FOLDERS[i];
      const { data: parent } = await supabase
        .from("folders")
        .insert({ business_id: businessId, name: df.name, sort_order: i, created_by: user.id })
        .select("id")
        .single();

      if (parent && df.children) {
        for (let j = 0; j < df.children.length; j++) {
          await supabase.from("folders").insert({
            business_id: businessId, name: df.children[j].name, parent_id: parent.id, sort_order: j, created_by: user.id,
          });
        }
      }
    }
  }

  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  function handleSelect(folderId: string) {
    router.push(`/dashboard/sops?folder=${folderId}`);
  }

  async function handleRename(id: string, name: string) {
    const { error } = await supabase
      .from("folders")
      .update({ name, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) { toast.error(error.message); return; }
    setTree((prev) => {
      const update = (nodes: FolderNode[]): FolderNode[] =>
        nodes.map((n) => ({ ...n, name: n.id === id ? name : n.name, children: update(n.children) }));
      return update(prev);
    });
  }

  async function handleDelete(id: string) {
    await supabase.from("sops").update({ folder_id: null }).eq("folder_id", id);
    const { error } = await supabase.from("folders").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Folder deleted. SOPs moved to Unfiled.");
    loadFolders();
    if (activeFolderId === id) router.push("/dashboard/sops");
  }

  async function handleCreate() {
    if (!newName.trim() || !currentBusiness?.id) return;
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from("folders").insert({
      business_id: currentBusiness.id,
      name: newName.trim(),
      parent_id: creatingParentId,
      sort_order: tree.length,
      created_by: user?.id,
    });

    if (error) { toast.error(error.message); return; }
    setNewName("");
    setCreating(false);
    setCreatingParentId(null);
    loadFolders();
  }

  async function handleDropSop(folderId: string, sopId: string) {
    const { error } = await supabase
      .from("sops")
      .update({ folder_id: folderId })
      .eq("id", sopId);

    if (error) {
      toast.error(error.message);
      return;
    }

    const folderName = tree.find((f) => f.id === folderId)?.name
      ?? tree.flatMap((f) => f.children).find((f) => f.id === folderId)?.name
      ?? "folder";
    toast.success(`Moved to ${folderName}`);
    loadFolders();
  }

  async function handleDropFolder(targetFolderId: string, draggedFolderId: string) {
    if (targetFolderId === draggedFolderId) return;
    // Prevent dropping into own descendant
    function isDescendant(parentId: string, checkId: string, nodes: FolderNode[]): boolean {
      for (const n of nodes) {
        if (n.id === parentId) {
          return n.children.some((c) => c.id === checkId || isDescendant(checkId, checkId, [c]));
        }
        if (isDescendant(parentId, checkId, n.children)) return true;
      }
      return false;
    }
    if (isDescendant(draggedFolderId, targetFolderId, tree)) {
      toast.error("Cannot move folder into its own subfolder");
      return;
    }
    const { error } = await supabase
      .from("folders")
      .update({ parent_id: targetFolderId })
      .eq("id", draggedFolderId);
    if (error) { toast.error(error.message); return; }
    toast.success("Folder moved");
    loadFolders();
  }

  function handleContextMenu(e: React.MouseEvent, folderId: string, folderName: string) {
    setContextMenu({ x: e.clientX, y: e.clientY, folderId, folderName });
  }

  async function openAccessControl(folderId: string) {
    setAccessFolderId(folderId);

    // Load current permissions
    const { data: folder } = await supabase
      .from("folders")
      .select("permissions")
      .eq("id", folderId)
      .single();

    const perms = folder?.permissions as { visible_to?: string[] } | null;
    const visibleTo = perms?.visible_to ?? ["all"];

    if (visibleTo.includes("all")) {
      setAccessMode("all");
      setAccessUserIds([]);
    } else {
      setAccessMode("selected");
      setAccessUserIds(visibleTo);
    }

    // Load team members for the picker
    if (currentBusiness?.id) {
      const { data: biz } = await supabase
        .from("businesses")
        .select("user_id")
        .eq("id", currentBusiness.id)
        .single();

      // For now, load the owner as the only team member
      // When team invites are fully implemented, query the team table
      if (biz) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, full_name")
          .eq("id", biz.user_id)
          .single();

        setTeamMembers(profile ? [{ id: profile.id, name: profile.full_name || "Owner" }] : []);
      }
    }
  }

  async function handleSaveAccess() {
    if (!accessFolderId) return;
    setAccessSaving(true);

    const permissions = accessMode === "all"
      ? { visible_to: ["all"] }
      : { visible_to: accessUserIds };

    const { error } = await supabase
      .from("folders")
      .update({ permissions })
      .eq("id", accessFolderId);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Access control updated");
      loadFolders();
    }

    setAccessSaving(false);
    setAccessFolderId(null);
  }

  function triggerRenameOnFolder(folderId: string) {
    // Find the DOM element and simulate edit mode via a custom event
    const el = document.querySelector(`[data-folder-id="${folderId}"]`);
    if (el) {
      // We'll use a simpler approach: just prompt for new name
      const currentName = contextMenu?.folderName ?? "";
      const newNameVal = prompt("Rename folder:", currentName);
      if (newNameVal && newNameVal.trim() && newNameVal !== currentName) {
        handleRename(folderId, newNameVal.trim());
      }
    }
  }

  function filterTree(nodes: FolderNode[], query: string): FolderNode[] {
    if (!query) return nodes;
    const q = query.toLowerCase();
    return nodes
      .map((n) => {
        const filteredChildren = filterTree(n.children, query);
        if (n.name.toLowerCase().includes(q) || filteredChildren.length > 0) {
          return { ...n, children: filteredChildren };
        }
        return null;
      })
      .filter(Boolean) as FolderNode[];
  }

  const displayTree = sidebarSearch ? filterTree(tree, sidebarSearch) : tree;
  const isOnSopsPage = pathname.startsWith("/dashboard/sops");

  if (!loaded) return null;

  return (
    <div className="space-y-1">
      {/* Context menu */}
      {contextMenu && (
        <FolderContextMenu
          menu={contextMenu}
          onClose={() => setContextMenu(null)}
          onOpen={() => handleSelect(contextMenu.folderId)}
          onNewSop={() => router.push(`/dashboard/sops/new?folder=${contextMenu.folderId}`)}
          onNewSubfolder={() => {
            setCreatingParentId(contextMenu.folderId);
            setCreating(true);
          }}
          onRename={() => triggerRenameOnFolder(contextMenu.folderId)}
          onDelete={() => handleDelete(contextMenu.folderId)}
          onAccessControl={() => openAccessControl(contextMenu.folderId)}
        />
      )}

      {/* SOP Wiki header */}
      <div
        className={cn(
          "flex items-center gap-2 rounded-md px-2 py-1.5 cursor-pointer transition-colors duration-100",
          isOnSopsPage && !activeFolderId
            ? "bg-primary/10 text-primary"
            : "text-foreground hover:bg-muted/50"
        )}
        onClick={() => {
          if (currentBusiness) {
            router.push("/dashboard/sops");
          } else {
            setShowCreateBusiness((v) => !v);
          }
        }}
      >
        <FileText className="h-4 w-4" />
        <span className="text-sm font-medium">Wiki</span>
      </div>

      {/* Create business prompt (when no business exists) */}
      {!currentBusiness && showCreateBusiness && (
        <div className="px-2 py-2">
          <p className="mb-2 text-xs text-muted-foreground">
            Create your first business to start building your wiki.
          </p>
          <form
            className="flex items-center gap-1"
            onSubmit={(e) => { e.preventDefault(); handleCreateBusiness(); }}
          >
            <Input
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Business name"
              className="h-7 text-xs"
              autoFocus
              disabled={creatingBusiness}
              onKeyDown={(e) => {
                if (e.key === "Escape") setShowCreateBusiness(false);
              }}
            />
            <button
              type="submit"
              disabled={creatingBusiness || !businessName.trim()}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded hover:bg-muted disabled:opacity-50"
            >
              <Check className="h-3 w-3" />
            </button>
            <button
              type="button"
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded hover:bg-muted"
              onClick={() => setShowCreateBusiness(false)}
            >
              <X className="h-3 w-3" />
            </button>
          </form>
        </div>
      )}

      {/* Folder tree (only when business exists) */}
      {currentBusiness && (
        <>
          <div className="max-h-[280px] overflow-y-auto">
            {displayTree.map((node) => (
              <FolderItem
                key={node.id}
                node={node}
                depth={0}
                activeFolderId={activeFolderId}
                onSelect={handleSelect}
                onRename={handleRename}
                onDelete={handleDelete}
                onContextMenu={handleContextMenu}
                onDropSop={handleDropSop}
                onDropFolder={handleDropFolder}
              />
            ))}

            {/* Unfiled */}
            {unfiledCount > 0 && (
              <div
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-1 py-1 text-xs cursor-pointer transition-colors duration-100",
                  activeFolderId === "unfiled"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}
                style={{ paddingLeft: "24px" }}
                onClick={() => router.push("/dashboard/sops?folder=unfiled")}
              >
                <FileText className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">Unfiled SOPs</span>
                <span className="shrink-0 font-mono text-[10px]">{unfiledCount}</span>
              </div>
            )}
          </div>

          {/* Inline new folder (triggered from context menu) */}
          {creating && (
            <form
              className="flex items-center gap-1 px-1"
              onSubmit={(e) => { e.preventDefault(); handleCreate(); }}
            >
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={creatingParentId ? "Subfolder name" : "Folder name"}
                className="h-7 text-xs"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setCreating(false);
                    setCreatingParentId(null);
                  }
                }}
              />
              <button type="submit" className="flex h-6 w-6 items-center justify-center rounded hover:bg-muted">
                <Check className="h-3 w-3" />
              </button>
              <button type="button" className="flex h-6 w-6 items-center justify-center rounded hover:bg-muted" onClick={() => { setCreating(false); setCreatingParentId(null); }}>
                <X className="h-3 w-3" />
              </button>
            </form>
          )}
        </>
      )}

      {/* Access control dialog */}
      {accessFolderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setAccessFolderId(null)}>
          <div className="w-72 rounded-md border bg-popover p-4 shadow-lg space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 text-sm font-medium">
              <Shield className="h-4 w-4" /> Access Control
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="radio"
                  name="access"
                  checked={accessMode === "all"}
                  onChange={() => setAccessMode("all")}
                  className="accent-primary"
                />
                Everyone (default)
              </label>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="radio"
                  name="access"
                  checked={accessMode === "selected"}
                  onChange={() => setAccessMode("selected")}
                  className="accent-primary"
                />
                Selected members only
              </label>
            </div>

            {accessMode === "selected" && (
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {teamMembers.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground">No team members yet. Invite members from the Team page.</p>
                ) : (
                  teamMembers.map((m) => (
                    <label key={m.id} className="flex items-center gap-2 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={accessUserIds.includes(m.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setAccessUserIds((prev) => [...prev, m.id]);
                          } else {
                            setAccessUserIds((prev) => prev.filter((id) => id !== m.id));
                          }
                        }}
                        className="accent-primary"
                      />
                      {m.name}
                    </label>
                  ))
                )}
                <p className="text-[10px] text-muted-foreground pt-1">Admin/owner always has access.</p>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                className="rounded-md bg-primary px-3 py-1 text-xs text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                onClick={handleSaveAccess}
                disabled={accessSaving}
              >
                {accessSaving ? "Saving..." : "Save"}
              </button>
              <button
                type="button"
                className="rounded-md border px-3 py-1 text-xs hover:bg-muted"
                onClick={() => setAccessFolderId(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
