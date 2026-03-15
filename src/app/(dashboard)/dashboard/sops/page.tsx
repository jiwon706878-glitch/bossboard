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
import { Plus, FileText, Search, Clock, Folder, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface SOP {
  id: string;
  title: string;
  summary: string | null;
  category: string | null;
  status: string;
  version: number;
  folder_id: string | null;
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
  const [searchQuery, setSearchQuery] = useState("");

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
      .select("id, title, summary, category, status, version, folder_id, created_at, updated_at")
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

  // Get subfolders of current folder
  const subfolders = folderId && folderId !== "unfiled"
    ? folders.filter((f) => f.parent_id === folderId)
    : !folderId
      ? [] // Don't show subfolders in "all" view
      : [];

  // Client-side search filter
  const filteredSops = searchQuery
    ? sops.filter(
        (s) =>
          s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.summary?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.category?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : sops;

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
      </div>

      {/* Subfolders */}
      {subfolders.length > 0 && !searchQuery && (
        <div className="flex flex-wrap gap-2">
          {subfolders.map((sf) => (
            <button
              key={sf.id}
              type="button"
              onClick={() => router.push(`/dashboard/sops?folder=${sf.id}`)}
              className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors duration-150 hover:bg-muted/50 border-border text-foreground"
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
      ) : filteredSops.length === 0 ? (
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
          {filteredSops.map((sop) => (
            <Card
              key={sop.id}
              className="cursor-pointer border bg-card transition-colors duration-150 hover:bg-muted/50"
              onClick={() => router.push(`/dashboard/sops/${sop.id}`)}
            >
              <CardContent className="flex items-center justify-between py-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {sop.isUnread && (
                      <span
                        className="h-2 w-2 shrink-0 rounded-full bg-primary"
                        title="Unread"
                      />
                    )}
                    <h3 className="truncate font-medium">{sop.title}</h3>
                    <Badge
                      variant="secondary"
                      className={cn("text-xs", STATUS_COLORS[sop.status])}
                    >
                      {sop.status}
                    </Badge>
                    {sop.category && (
                      <Badge variant="outline" className="text-xs">
                        {sop.category}
                      </Badge>
                    )}
                  </div>
                  {sop.summary && (
                    <p className="mt-1 truncate text-sm text-muted-foreground">
                      {sop.summary}
                    </p>
                  )}
                </div>
                <div className="ml-4 flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {formatDate(sop.updated_at || sop.created_at)}
                  <span className="ml-1 font-mono text-[11px]">v{sop.version}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
