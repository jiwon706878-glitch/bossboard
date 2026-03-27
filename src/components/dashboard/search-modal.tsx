"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useBusinessStore } from "@/hooks/use-business";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Search, Sparkles, FileText, Loader2 } from "lucide-react";
import { formatShortDate, STATUS_COLORS } from "@/types/sops";

interface SearchResult {
  id: string;
  title: string;
  summary: string | null;
  doc_type: string;
  status: string;
  updated_at: string;
  rank?: number;
}

interface SearchSource {
  id: string;
  title: string;
}

export function SearchModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const currentBusiness = useBusinessStore((s) => s.currentBusiness);
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [aiSources, setAiSources] = useState<SearchSource[]>([]);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  // Detect if query looks like a question
  const isQuestion = /[?？]/.test(query) ||
    /^(how|what|when|where|why|who|which|is|are|can|do|does|어떻|뭐|언제|어디|왜|누가|몇)/i.test(query.trim());

  // Reset state on close
  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      setAiAnswer(null);
      setAiSources([]);
      setSelectedIdx(0);
    }
  }, [open]);

  // Focus input on open
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  // Debounced text search
  const doSearch = useCallback(async (q: string) => {
    if (!q.trim() || !currentBusiness?.id) {
      setResults([]);
      setAiAnswer(null);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(q)}&businessId=${currentBusiness.id}&mode=text`
      );
      const data = await res.json();
      setResults(data.results ?? []);
      setSelectedIdx(0);
    } catch {
      setResults([]);
    }
    setLoading(false);
  }, [currentBusiness?.id]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setAiAnswer(null);
    setAiSources([]);
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(() => doSearch(query), 200);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, doSearch]);

  // AI search
  async function handleAiSearch() {
    if (!query.trim() || !currentBusiness?.id) return;
    setAiLoading(true);
    try {
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(query)}&businessId=${currentBusiness.id}&mode=ai`
      );
      const data = await res.json();
      setResults(data.results ?? []);
      setAiAnswer(data.aiAnswer ?? null);
      setAiSources(data.sources ?? []);
    } catch {
      setAiAnswer("Search failed. Please try again.");
    }
    setAiLoading(false);
  }

  // Keyboard navigation
  function handleKeyDown(e: React.KeyboardEvent) {
    const totalItems = results.length;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx((i) => Math.min(i + 1, totalItems - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (isQuestion && !aiAnswer && !aiLoading) {
        handleAiSearch();
      } else if (results[selectedIdx]) {
        navigate(results[selectedIdx].id);
      }
    }
  }

  function navigate(sopId: string) {
    onOpenChange(false);
    router.push(`/dashboard/sops/${sopId}`);
  }

  function snippetHighlight(text: string | null, q: string): string {
    if (!text) return "";
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return text.substring(0, 120);
    const start = Math.max(0, idx - 40);
    const end = Math.min(text.length, idx + q.length + 80);
    return (start > 0 ? "..." : "") + text.substring(start, end) + (end < text.length ? "..." : "");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden">
        <DialogTitle className="sr-only">Search documents</DialogTitle>
        <DialogDescription className="sr-only">Search your wiki documents by title or content</DialogDescription>

        {/* Search input */}
        <div className="flex items-center gap-2 border-b px-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search documents..."
            className="h-11 border-0 shadow-none focus-visible:ring-0 text-sm"
          />
          {loading && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />}
          {isQuestion && !aiAnswer && !aiLoading && query.length >= 3 && (
            <button
              type="button"
              onClick={handleAiSearch}
              className="flex shrink-0 items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-xs text-primary hover:bg-primary/20 transition-colors"
            >
              <Sparkles className="h-3 w-3" />
              AI
            </button>
          )}
        </div>

        {/* Results */}
        <div className="max-h-[400px] overflow-y-auto">
          {/* AI answer */}
          {(aiAnswer || aiLoading) && (
            <div className="border-b bg-primary/5 px-4 py-3">
              {aiLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Searching with AI...
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-primary">
                    <Sparkles className="h-3 w-3" />
                    AI Answer
                  </div>
                  <p className="text-sm">{aiAnswer}</p>
                  {aiSources.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {aiSources.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => navigate(s.id)}
                          className="text-[11px] text-primary hover:underline"
                        >
                          {s.title}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Document results */}
          {results.length > 0 ? (
            <div className="py-1">
              {results.map((r, idx) => (
                <button
                  key={r.id}
                  type="button"
                  className={cn(
                    "flex w-full items-start gap-3 px-4 py-2.5 text-left transition-colors",
                    selectedIdx === idx ? "bg-muted" : "hover:bg-muted/50"
                  )}
                  onClick={() => navigate(r.id)}
                  onMouseEnter={() => setSelectedIdx(idx)}
                >
                  <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/50" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">{r.title}</span>
                      <Badge
                        variant="secondary"
                        className={cn("shrink-0 text-[10px] px-1.5 py-0", STATUS_COLORS[r.status])}
                      >
                        {r.status}
                      </Badge>
                    </div>
                    {r.summary && (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {snippetHighlight(r.summary, query)}
                      </p>
                    )}
                    <span className="text-[10px] text-muted-foreground/70">
                      {r.doc_type} · {formatShortDate(r.updated_at)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          ) : query.length >= 2 && !loading ? (
            <div className="flex flex-col items-center gap-2 py-8 text-sm text-muted-foreground">
              <p>No documents found</p>
              {isQuestion && !aiAnswer && (
                <button
                  type="button"
                  onClick={handleAiSearch}
                  className="flex items-center gap-1 text-primary hover:underline text-xs"
                >
                  <Sparkles className="h-3 w-3" /> Try AI search
                </button>
              )}
            </div>
          ) : !query ? (
            <div className="py-6 text-center text-xs text-muted-foreground">
              Type to search titles and content
            </div>
          ) : null}
        </div>

        {/* Footer hint */}
        <div className="flex items-center gap-3 border-t px-3 py-2 text-[10px] text-muted-foreground">
          <span><kbd className="rounded border px-1">↑↓</kbd> Navigate</span>
          <span><kbd className="rounded border px-1">↵</kbd> Open</span>
          <span><kbd className="rounded border px-1">esc</kbd> Close</span>
          {isQuestion && <span><kbd className="rounded border px-1">↵</kbd> or click AI for AI answer</span>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
