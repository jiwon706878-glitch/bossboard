"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useBusinessStore } from "@/hooks/use-business";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ChevronRight,
  ChevronDown,
  FolderOpen,
  Folder,
  FileText,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  X,
  Check,
  Search,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

interface FolderRow {
  id: string;
  name: string;
  parent_id: string | null;
  sort_order: number;
}

interface FolderNode extends FolderRow {
  children: FolderNode[];
  sopCount: number;
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
    map.set(f.id, { ...f, children: [], sopCount: sopCounts[f.id] ?? 0 });
  }

  for (const node of map.values()) {
    if (node.parent_id && map.has(node.parent_id)) {
      map.get(node.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  // Sort by sort_order then name
  const sort = (arr: FolderNode[]) => {
    arr.sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
    arr.forEach((n) => sort(n.children));
  };
  sort(roots);

  return roots;
}

function FolderItem({
  node,
  depth,
  activeFolderId,
  onSelect,
  onRename,
  onDelete,
}: {
  node: FolderNode;
  depth: number;
  activeFolderId: string | null;
  onSelect: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(depth === 0);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(node.name);
  const hasChildren = node.children.length > 0;
  const isActive = activeFolderId === node.id;

  function handleRename() {
    if (editName.trim() && editName !== node.name) {
      onRename(node.id, editName.trim());
    }
    setEditing(false);
  }

  return (
    <div>
      <div
        className={cn(
          "group flex items-center gap-1 rounded-md px-1 py-1 text-sm transition-colors duration-100 cursor-pointer",
          isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
        )}
        style={{ paddingLeft: `${depth * 16 + 4}px` }}
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
            expanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )
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
            <span className="truncate text-xs">{node.name}</span>
          )}
        </div>

        {/* Count + menu */}
        {!editing && (
          <>
            {node.sopCount > 0 && (
              <span className="shrink-0 text-[10px] text-muted-foreground font-mono">
                {node.sopCount}
              </span>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded opacity-0 group-hover:opacity-100 hover:bg-muted"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-3 w-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-32">
                <DropdownMenuItem onClick={() => { setEditing(true); setEditName(node.name); }}>
                  <Pencil className="mr-2 h-3 w-3" /> Rename
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => onDelete(node.id)}
                >
                  <Trash2 className="mr-2 h-3 w-3" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
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
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function FolderTree() {
  const supabase = createClient();
  const { currentBusiness } = useBusinessStore();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeFolderId = searchParams.get("folder");

  const [tree, setTree] = useState<FolderNode[]>([]);
  const [unfiledCount, setUnfiledCount] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [sidebarSearch, setSidebarSearch] = useState("");

  const loadFolders = useCallback(async () => {
    if (!currentBusiness?.id) return;

    const [{ data: folders }, { data: sops }] = await Promise.all([
      supabase
        .from("folders")
        .select("id, name, parent_id, sort_order")
        .eq("business_id", currentBusiness.id)
        .order("sort_order"),
      supabase
        .from("sops")
        .select("id, folder_id")
        .eq("business_id", currentBusiness.id),
    ]);

    if (!folders) {
      setLoaded(true);
      return;
    }

    // Auto-create defaults if no folders exist
    if (folders.length === 0) {
      await createDefaultFolders(currentBusiness.id);
      loadFolders(); // reload
      return;
    }

    // Count SOPs per folder
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
        .insert({
          business_id: businessId,
          name: df.name,
          sort_order: i,
          created_by: user.id,
        })
        .select("id")
        .single();

      if (parent && df.children) {
        for (let j = 0; j < df.children.length; j++) {
          await supabase.from("folders").insert({
            business_id: businessId,
            name: df.children[j].name,
            parent_id: parent.id,
            sort_order: j,
            created_by: user.id,
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

    if (error) {
      toast.error(error.message);
      return;
    }
    setTree((prev) => {
      const update = (nodes: FolderNode[]): FolderNode[] =>
        nodes.map((n) => ({
          ...n,
          name: n.id === id ? name : n.name,
          children: update(n.children),
        }));
      return update(prev);
    });
  }

  async function handleDelete(id: string) {
    // Move SOPs to unfiled first
    await supabase
      .from("sops")
      .update({ folder_id: null })
      .eq("folder_id", id);

    const { error } = await supabase.from("folders").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Folder deleted. SOPs moved to Unfiled.");
    loadFolders();

    if (activeFolderId === id) {
      router.push("/dashboard/sops");
    }
  }

  async function handleCreate() {
    if (!newName.trim() || !currentBusiness?.id) return;

    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from("folders").insert({
      business_id: currentBusiness.id,
      name: newName.trim(),
      sort_order: tree.length,
      created_by: user?.id,
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    setNewName("");
    setCreating(false);
    loadFolders();
  }

  // Filter tree for sidebar search
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
      {/* SOP Wiki header */}
      <div
        className={cn(
          "flex items-center gap-2 rounded-md px-2 py-1.5 cursor-pointer transition-colors duration-100",
          isOnSopsPage && !activeFolderId
            ? "bg-primary/10 text-primary"
            : "text-foreground hover:bg-muted/50"
        )}
        onClick={() => router.push("/dashboard/sops")}
      >
        <FileText className="h-4 w-4" />
        <span className="text-sm font-medium">SOP Wiki</span>
      </div>

      {/* Sidebar search */}
      <div className="px-1">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search folders..."
            value={sidebarSearch}
            onChange={(e) => setSidebarSearch(e.target.value)}
            className="h-7 pl-7 text-xs"
          />
        </div>
      </div>

      {/* Folder tree */}
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

      {/* New folder */}
      {creating ? (
        <form
          className="flex items-center gap-1 px-1"
          onSubmit={(e) => { e.preventDefault(); handleCreate(); }}
        >
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Folder name"
            className="h-7 text-xs"
            autoFocus
            onKeyDown={(e) => e.key === "Escape" && setCreating(false)}
          />
          <button type="submit" className="flex h-6 w-6 items-center justify-center rounded hover:bg-muted">
            <Check className="h-3 w-3" />
          </button>
          <button type="button" className="flex h-6 w-6 items-center justify-center rounded hover:bg-muted" onClick={() => setCreating(false)}>
            <X className="h-3 w-3" />
          </button>
        </form>
      ) : (
        <button
          type="button"
          className="flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors duration-100"
          onClick={() => setCreating(true)}
        >
          <Plus className="h-3 w-3" />
          New Folder
        </button>
      )}
    </div>
  );
}
