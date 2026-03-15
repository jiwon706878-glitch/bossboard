"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useBusinessStore } from "@/hooks/use-business";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, FileText, Search, Clock, Folder, ChevronRight, Pin, MoreHorizontal, Pencil, Trash2, FolderInput, GripVertical } from "lucide-react";
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

function SOPCard({
  sop,
  router,
  onPin,
  onDelete,
  folders,
  onMove,
}: {
  sop: SOP;
  router: ReturnType<typeof useRouter>;
  onPin?: (id: string, pinned: boolean) => void;
  onDelete?: (id: string) => void;
  folders?: FolderRow[];
  onMove?: (sopId: string, folderId: string) => void;
}) {
  return (
    <Card
      className="group cursor-pointer border bg-card transition-colors duration-150 hover:bg-muted/50"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", sop.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      onClick={() => router.push(`/dashboard/sops/${sop.id}`)}
    >
      <CardContent className="flex items-center justify-between py-4">
        {/* Drag handle */}
        <GripVertical className="mr-2 h-4 w-4 shrink-0 cursor-grab text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity" />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {sop.isUnread && (
              <span className="h-2 w-2 shrink-0 rounded-full bg-primary" title="Unread" />
            )}
            {sop.pinned && <Pin className="h-3 w-3 shrink-0 text-amber-400" />}
            <h3 className="truncate font-medium">{sop.title}</h3>
            <Badge variant="secondary" className={cn("text-xs", STATUS_COLORS[sop.status])}>
              {sop.status}
            </Badge>
            {sop.doc_type && sop.doc_type !== "sop" && (
              <Badge variant="outline" className="text-xs capitalize">{sop.doc_type}</Badge>
            )}
            {sop.category && (
              <Badge variant="outline" className="text-xs">{sop.category}</Badge>
            )}
          </div>
          {sop.summary && (
            <p className="mt-1 truncate text-sm text-muted-foreground">{sop.summary}</p>
          )}
          {sop.tags && sop.tags.length > 0 && (
            <div className="mt-1 flex gap-1">
              {sop.tags.slice(0, 4).map((tag) => (
                <span key={tag} className="rounded bg-accent px-1.5 py-0 text-[10px] text-accent-foreground">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="ml-4 flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          {formatDate(sop.updated_at || sop.created_at)}
          <span className="ml-1 font-mono text-[11px]">v{sop.version}</span>

          {/* Inline actions menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="ml-1 flex h-7 w-7 items-center justify-center rounded opacity-0 group-hover:opacity-100 hover:bg-muted transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/sops/${sop.id}/edit`); }}>
                <Pencil className="mr-2 h-3 w-3" /> Edit
              </DropdownMenuItem>
              {onPin && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onPin(sop.id, !sop.pinned); }}>
                  <Pin className="mr-2 h-3 w-3" /> {sop.pinned ? "Unpin" : "Pin"}
                </DropdownMenuItem>
              )}
              {onMove && folders && folders.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  {folders.slice(0, 6).map((f) => (
                    <DropdownMenuItem key={f.id} onClick={(e) => { e.stopPropagation(); onMove(sop.id, f.id); }}>
                      <FolderInput className="mr-2 h-3 w-3" /> {f.name}
                    </DropdownMenuItem>
                  ))}
                </>
              )}
              {onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(sop.id); }}>
                    <Trash2 className="mr-2 h-3 w-3" /> Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function SOPsPage() {
  const [sops, setSops] = useState<SOP[]>([]);
  const [folders, setFolders] = useState<FolderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [docTypeFilter, setDocTypeFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("updated");
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);

  const supabase = createClient();
  const currentBusiness = useBusinessStore((s) => s.currentBusiness);
  const router = useRouter();
  const searchParams = useSearchParams();
  const folderId = searchParams.get("folder");

  // Build breadcrumb path
  function getBreadcrumbs(): { id: string | null; name: string }[] {
    const crumbs: { id: string | null; name: string }[] = [
      { id: null, name: "SOP Wiki" },
    ];
    if (!folderId || folderId === "unfiled") {
      if (folderId === "unfiled") crumbs.push({ id: "unfiled", name: "Unfiled SOPs" });
      return crumbs;
    }
    // Walk up the tree
    const path: FolderRow[] = [];
    let current = folders.find((f) => f.id === folderId);
    while (current) {
      path.unshift(current);
      current = current.parent_id
        ? folders.find((f) => f.id === current!.parent_id)
        : undefined;
    }
    for (const f of path) {
      crumbs.push({ id: f.id, name: f.name });
    }
    return crumbs;
  }

  const fetchData = useCallback(async () => {
    if (!currentBusiness) return;
    setLoading(true);

    // Fetch folders
    const { data: allFolders } = await supabase
      .from("folders")
      .select("id, name, parent_id")
      .eq("business_id", currentBusiness.id);
    setFolders(allFolders ?? []);

    // Build SOP query
    let query = supabase
      .from("sops")
      .select("id, title, summary, category, status, version, folder_id, doc_type, tags, pinned, created_at, updated_at")
      .eq("business_id", currentBusiness.id)
      .order("updated_at", { ascending: false });

    if (statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }

    // Filter by folder
    if (folderId === "unfiled") {
      query = query.is("folder_id", null);
    } else if (folderId) {
      query = query.eq("folder_id", folderId);
    }

    const { data } = await query;
    if (!data) {
      setSops([]);
      setLoading(false);
      return;
    }

    // Check which SOPs the current user has read
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const sopIds = data.map((s) => s.id);
      if (sopIds.length > 0) {
        const { data: reads } = await supabase
          .from("sop_reads")
          .select("sop_id")
          .eq("user_id", user.id)
          .in("sop_id", sopIds);

        const readSopIds = new Set((reads ?? []).map((r) => r.sop_id));
        setSops(data.map((s) => ({ ...s, isUnread: !readSopIds.has(s.id) })));
      } else {
        setSops([]);
      }
    } else {
      setSops(data);
    }
    setLoading(false);
  }, [currentBusiness, statusFilter, folderId, supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handlePin(sopId: string, pinned: boolean) {
    const { error } = await supabase.from("sops").update({ pinned }).eq("id", sopId);
    if (error) { toast.error(error.message); return; }
    toast.success(pinned ? "SOP pinned" : "SOP unpinned");
    fetchData();
  }

  async function handleDeleteSop(sopId: string) {
    const { error } = await supabase.from("sops").delete().eq("id", sopId);
    if (error) { toast.error(error.message); return; }
    toast.success("SOP deleted");
    fetchData();
  }

  async function handleMoveSop(sopId: string, targetFolderId: string) {
    const { error } = await supabase.from("sops").update({ folder_id: targetFolderId }).eq("id", sopId);
    if (error) { toast.error(error.message); return; }
    const folderName = folders.find((f) => f.id === targetFolderId)?.name ?? "folder";
    toast.success(`Moved to ${folderName}`);
    fetchData();
  }

  async function handleDropOnFolder(folderId: string, e: React.DragEvent) {
    e.preventDefault();
    setDragOverFolder(null);
    const sopId = e.dataTransfer.getData("text/plain");
    if (!sopId) return;

    const { error } = await supabase
      .from("sops")
      .update({ folder_id: folderId })
      .eq("id", sopId);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("SOP moved to folder");
    fetchData();
  }

  // Get subfolders of current folder
  const subfolders = folderId && folderId !== "unfiled"
    ? folders.filter((f) => f.parent_id === folderId)
    : !folderId
      ? [] // Don't show subfolders in "all" view
      : [];

  // Client-side filtering
  let filteredSops = sops;

  if (docTypeFilter !== "all") {
    filteredSops = filteredSops.filter((s) => (s.doc_type || "sop") === docTypeFilter);
  }

  if (tagFilter) {
    filteredSops = filteredSops.filter((s) => s.tags?.includes(tagFilter));
  }

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filteredSops = filteredSops.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.summary?.toLowerCase().includes(q) ||
        s.category?.toLowerCase().includes(q) ||
        s.tags?.some((t) => t.toLowerCase().includes(q))
    );
  }

  // Sort
  const sortedSops = [...filteredSops].sort((a, b) => {
    switch (sortBy) {
      case "title": return a.title.localeCompare(b.title);
      case "created": return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case "status": return a.status.localeCompare(b.status);
      default: return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    }
  });

  // Separate pinned and unpinned
  const pinnedSops = sortedSops.filter((s) => s.pinned);
  const unpinnedSops = sortedSops.filter((s) => !s.pinned);

  // Collect all tags for filter chips
  const allTags: Record<string, number> = {};
  for (const s of sops) {
    for (const t of s.tags ?? []) {
      allTags[t] = (allTags[t] ?? 0) + 1;
    }
  }
  const popularTags = Object.entries(allTags).sort((a, b) => b[1] - a[1]).slice(0, 8);

  const breadcrumbs = getBreadcrumbs();
  const currentFolderName = folderId
    ? folderId === "unfiled"
      ? "Unfiled SOPs"
      : folders.find((f) => f.id === folderId)?.name ?? "SOP Wiki"
    : "SOP Wiki";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {folderId ? currentFolderName : "Standard Operating Procedures"}
          </h1>

          {/* Breadcrumbs */}
          {breadcrumbs.length > 1 && (
            <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
              {breadcrumbs.map((crumb, i) => (
                <span key={crumb.id ?? "root"} className="flex items-center gap-1">
                  {i > 0 && <ChevronRight className="h-3 w-3" />}
                  {i < breadcrumbs.length - 1 ? (
                    <Link
                      href={crumb.id ? `/dashboard/sops?folder=${crumb.id}` : "/dashboard/sops"}
                      className="hover:text-foreground hover:underline"
                    >
                      {crumb.name}
                    </Link>
                  ) : (
                    <span className="text-foreground">{crumb.name}</span>
                  )}
                </span>
              ))}
            </div>
          )}

          {!folderId && (
            <p className="text-muted-foreground">
              Create and manage SOPs for your team with AI assistance.
            </p>
          )}
        </div>
        <Link href="/dashboard/sops/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" /> New SOP
          </Button>
        </Link>
      </div>

      {/* Search + Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search SOPs by title or content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="updated">Last Updated</SelectItem>
            <SelectItem value="title">Title A-Z</SelectItem>
            <SelectItem value="created">Created Date</SelectItem>
            <SelectItem value="status">Status</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Doc type tabs */}
      <div className="flex items-center gap-2">
        {[
          { value: "all", label: "All" },
          { value: "sop", label: "SOPs" },
          { value: "note", label: "Notes" },
          { value: "policy", label: "Policies" },
        ].map((dt) => (
          <button
            key={dt.value}
            type="button"
            onClick={() => setDocTypeFilter(dt.value)}
            className={cn(
              "rounded-md px-3 py-1 text-xs font-medium transition-colors duration-100",
              docTypeFilter === dt.value
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            )}
          >
            {dt.label}
          </button>
        ))}
      </div>

      {/* Tag chips */}
      {popularTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground mr-1">Tags:</span>
          {popularTags.map(([tag, count]) => (
            <button
              key={tag}
              type="button"
              onClick={() => setTagFilter(tagFilter === tag ? "" : tag)}
              className={cn(
                "rounded-md px-2 py-0.5 text-[11px] transition-colors duration-100",
                tagFilter === tag
                  ? "bg-primary/15 text-primary"
                  : "bg-accent text-accent-foreground hover:bg-muted"
              )}
            >
              #{tag}
              <span className="ml-1 text-muted-foreground">({count})</span>
            </button>
          ))}
          {tagFilter && (
            <button
              type="button"
              onClick={() => setTagFilter("")}
              className="text-[11px] text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* Subfolders */}
      {subfolders.length > 0 && !searchQuery && (
        <div className="flex flex-wrap gap-2">
          {subfolders.map((sf) => (
            <button
              key={sf.id}
              type="button"
              onClick={() => router.push(`/dashboard/sops?folder=${sf.id}`)}
              onDragOver={(e) => { e.preventDefault(); setDragOverFolder(sf.id); }}
              onDragLeave={() => setDragOverFolder(null)}
              onDrop={(e) => handleDropOnFolder(sf.id, e)}
              className={cn(
                "flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-all duration-150 border-border text-foreground",
                dragOverFolder === sf.id
                  ? "border-primary bg-primary/10 scale-105"
                  : "hover:bg-muted/50"
              )}
            >
              <Folder className="h-4 w-4 text-muted-foreground" />
              {sf.name}
            </button>
          ))}
        </div>
      )}

      {/* SOP list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-md border bg-muted/40"
            />
          ))}
        </div>
      ) : pinnedSops.length === 0 && unpinnedSops.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <h3 className="mb-1 text-lg font-medium">
              {searchQuery || statusFilter !== "all"
                ? "No SOPs match your filters"
                : folderId
                  ? "This folder is empty"
                  : "No SOPs yet"}
            </h3>
            <p className="mb-4 text-sm text-muted-foreground">
              {searchQuery || statusFilter !== "all"
                ? "Try adjusting your search or filters."
                : "Create your first SOP to get started. AI can help you generate one in seconds."}
            </p>
            {!searchQuery && statusFilter === "all" && (
              <Link href="/dashboard/sops/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" /> Create your first SOP
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {/* Pinned SOPs */}
          {pinnedSops.length > 0 && (
            <>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Pin className="h-3 w-3 text-amber-400" />
                <span>Pinned ({pinnedSops.length})</span>
              </div>
              {pinnedSops.map((sop) => (
                <SOPCard key={sop.id} sop={sop} router={router} onPin={handlePin} onDelete={handleDeleteSop} folders={folders} onMove={handleMoveSop} />
              ))}
              {unpinnedSops.length > 0 && <div className="h-2" />}
            </>
          )}
          {unpinnedSops.map((sop) => (
            <SOPCard key={sop.id} sop={sop} router={router} onPin={handlePin} onDelete={handleDeleteSop} folders={folders} onMove={handleMoveSop} />
          ))}
        </div>
      )}
    </div>
  );
}
