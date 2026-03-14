"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { Plus, FileText, Search, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface SOP {
  id: string;
  title: string;
  summary: string | null;
  category: string | null;
  status: string;
  version: number;
  created_at: string;
  updated_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  published: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  archived: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
};

const CATEGORIES = [
  "onboarding",
  "operations",
  "safety",
  "customer-service",
  "inventory",
  "hr",
  "marketing",
  "finance",
  "other",
];

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
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const supabase = createClient();
  const currentBusiness = useBusinessStore((s) => s.currentBusiness);
  const router = useRouter();

  useEffect(() => {
    async function fetchSOPs() {
      if (!currentBusiness) return;
      setLoading(true);

      let query = supabase
        .from("sops")
        .select("id, title, summary, category, status, version, created_at, updated_at")
        .eq("business_id", currentBusiness.id)
        .order("updated_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data } = await query;
      setSops(data ?? []);
      setLoading(false);
    }
    fetchSOPs();
  }, [currentBusiness, statusFilter, supabase]);

  const filteredSops = searchQuery
    ? sops.filter(
        (s) =>
          s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.category?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : sops;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Standard Operating Procedures</h1>
          <p className="text-muted-foreground">
            Create and manage SOPs for your team with AI assistance.
          </p>
        </div>
        <Link href="/dashboard/sops/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" /> New SOP
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search SOPs..."
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
            <h3 className="mb-1 text-lg font-medium">No SOPs yet</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              {searchQuery || statusFilter !== "all"
                ? "No SOPs match your filters. Try adjusting your search."
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
