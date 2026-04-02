"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Search, ArrowUpDown, ChevronDown, ChevronUp, Trash2, Download } from "lucide-react";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface FeedbackItem {
  id: string;
  user_name: string;
  user_email: string;
  business_name: string;
  content: string;
  category: string;
  read: boolean;
  created_at: string;
}

type SortField = "created_at" | "user_name" | "category";
type SortDir = "asc" | "desc";

const CATEGORY_COLORS: Record<string, string> = {
  feedback: "bg-blue-400/10 text-blue-600",
  bug: "bg-red-400/10 text-red-600",
  feature: "bg-purple-400/10 text-purple-600",
};

const CATEGORY_LABELS: Record<string, string> = {
  feedback: "Feedback",
  bug: "Bug Report",
  feature: "Feature Request",
};

export function FeedbackTable({ items: initialItems }: { items: FeedbackItem[] }) {
  const [items, setItems] = useState(initialItems);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const supabase = createClient();

  const filtered = useMemo(() => {
    let result = [...items];
    if (categoryFilter !== "all") result = result.filter((f) => f.category === categoryFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (f) => f.content.toLowerCase().includes(q) || f.user_name.toLowerCase().includes(q) || f.user_email.toLowerCase().includes(q) || f.business_name.toLowerCase().includes(q)
      );
    }
    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === "created_at") cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      else if (sortField === "user_name") cmp = a.user_name.localeCompare(b.user_name);
      else if (sortField === "category") cmp = a.category.localeCompare(b.category);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return result;
  }, [items, searchQuery, categoryFilter, sortField, sortDir]);

  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("desc"); }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 text-muted-foreground/50" />;
    return sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />;
  }

  async function markAsRead(id: string) {
    await supabase.from("feedback").update({ read: true }).eq("id", id);
    setItems((prev) => prev.map((f) => f.id === id ? { ...f, read: true } : f));
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this feedback?")) return;
    setDeletingId(id);
    const { error } = await supabase.from("feedback").delete().eq("id", id);
    if (error) { console.error("Feedback delete error:", error.message); toast.error("Failed to delete feedback. Please try again."); }
    else { setItems((prev) => prev.filter((f) => f.id !== id)); toast.success("Feedback deleted"); }
    setDeletingId(null);
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
  }

  function handleExport() {
    const exportData = filtered.map((f) => ({
      "Date": new Date(f.created_at).toLocaleString("en-US", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }),
      "User": f.user_name,
      "Email": f.user_email,
      "Business": f.business_name,
      "Category": CATEGORY_LABELS[f.category] || f.category,
      "Content": f.content,
      "Read": f.read ? "Yes" : "No",
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    ws["!cols"] = [{ wch: 18 }, { wch: 15 }, { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 60 }, { wch: 6 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Feedback");
    XLSX.writeFile(wb, `bossboard-feedback-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  return (
    <Card>
      <CardContent className="pt-4 space-y-4">
        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by content, user, or business..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[160px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="feedback">Feedback</SelectItem>
              <SelectItem value="bug">Bug Reports</SelectItem>
              <SelectItem value="feature">Feature Requests</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="h-9 gap-2" onClick={handleExport} disabled={filtered.length === 0}>
            <Download className="h-3.5 w-3.5" />
            Export
          </Button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2 pr-4 w-4"></th>
                <th className="pb-2 pr-4">
                  <button type="button" onClick={() => toggleSort("created_at")} className="flex items-center gap-1 font-medium text-xs text-muted-foreground hover:text-foreground">
                    Date <SortIcon field="created_at" />
                  </button>
                </th>
                <th className="pb-2 pr-4">
                  <button type="button" onClick={() => toggleSort("user_name")} className="flex items-center gap-1 font-medium text-xs text-muted-foreground hover:text-foreground">
                    User <SortIcon field="user_name" />
                  </button>
                </th>
                <th className="pb-2 pr-4 font-medium text-xs text-muted-foreground">Business</th>
                <th className="pb-2 pr-4">
                  <button type="button" onClick={() => toggleSort("category")} className="flex items-center gap-1 font-medium text-xs text-muted-foreground hover:text-foreground">
                    Type <SortIcon field="category" />
                  </button>
                </th>
                <th className="pb-2 pr-4 font-medium text-xs text-muted-foreground">Content</th>
                <th className="pb-2 font-medium text-xs text-muted-foreground w-10"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-muted-foreground">No feedback found</td>
                </tr>
              ) : (
                filtered.map((f) => (
                  <tr key={f.id} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="py-3 pr-2">
                      {!f.read && <span className="block h-2 w-2 rounded-full bg-primary" />}
                    </td>
                    <td className="py-3 pr-4 whitespace-nowrap text-xs text-muted-foreground">
                      {formatDate(f.created_at)}
                    </td>
                    <td className="py-3 pr-4">
                      <p className="font-medium text-xs">{f.user_name}</p>
                      <p className="text-[10px] text-muted-foreground">{f.user_email}</p>
                    </td>
                    <td className="py-3 pr-4 text-xs text-muted-foreground">{f.business_name}</td>
                    <td className="py-3 pr-4">
                      <Badge variant="secondary" className={cn("text-[10px]", CATEGORY_COLORS[f.category])}>
                        {CATEGORY_LABELS[f.category] || f.category}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4">
                      <button
                        type="button"
                        onClick={() => {
                          const opening = expandedId !== f.id;
                          setExpandedId(opening ? f.id : null);
                          if (opening && !f.read) markAsRead(f.id);
                        }}
                        className="text-left"
                      >
                        <p className={cn("text-xs", expandedId === f.id ? "whitespace-pre-wrap" : "truncate max-w-[300px]")}>
                          {f.content}
                        </p>
                      </button>
                    </td>
                    <td className="py-3">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(f.id)}
                        disabled={deletingId === f.id}
                        aria-label="Delete feedback"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="text-xs text-muted-foreground pt-2">
          Showing {filtered.length} of {items.length} items
        </div>
      </CardContent>
    </Card>
  );
}
