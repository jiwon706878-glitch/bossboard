"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Edit, FileText, Clock, Lock, ArrowLeft } from "lucide-react";
import dynamic from "next/dynamic";
import { formatLongDate } from "@/types/sops";
import { useSopDetail } from "@/hooks/use-sop-detail";
import { useBusinessStore } from "@/hooks/use-business";
import { SOPDetailHeader } from "@/components/sops/sop-detail-header";
import { SOPDetailActions } from "@/components/sops/sop-detail-actions";
import { VersionHistoryModal } from "@/components/sops/version-history-modal";

const SOPEditor = dynamic(
  () => import("@/components/sops/sop-editor").then((m) => ({ default: m.SOPEditor })),
  { ssr: false, loading: () => <div className="rounded-md border bg-card p-4 text-sm text-muted-foreground">Loading editor...</div> }
);

export default function SOPDetailPage() {
  const params = useParams();
  const router = useRouter();
  const sopId = params.id as string;
  const currentBusiness = useBusinessStore((s) => s.currentBusiness);
  const {
    sop, loading, deleteOpen, setDeleteOpen, deleting, creatingChecklist,
    historyOpen, setHistoryOpen, versions, previewVersion, setPreviewVersion,
    handleDelete, handleCreateChecklist, handleTogglePin,
    loadHistory, restoreVersion,
  } = useSopDetail(sopId);

  const isCopyProtected = sop?.copy_protected === true;
  const [backlinks, setBacklinks] = useState<Array<{ id: string; title: string }>>([]);

  useEffect(() => {
    if (!sopId || !currentBusiness?.id) return;
    async function fetchBacklinks() {
      const supabase = createClient();
      const { data } = await supabase
        .from("sops")
        .select("id, title, content")
        .eq("business_id", currentBusiness!.id)
        .is("deleted_at", null)
        .neq("id", sopId);
      if (!data) return;
      const refs = data.filter((doc: any) => {
        const str = JSON.stringify(doc.content || {});
        return str.includes(sopId);
      });
      setBacklinks(refs.map((r: any) => ({ id: r.id, title: r.title })));
    }
    fetchBacklinks();
  }, [sopId, currentBusiness?.id]);

  // Scroll position save/restore
  useEffect(() => {
    const mainEl = document.querySelector("main");
    if (!mainEl) return;
    function saveScroll() {
      sessionStorage.setItem(`scroll-sop-${sopId}`, String(mainEl!.scrollTop));
    }
    mainEl.addEventListener("scroll", saveScroll, { passive: true });
    return () => mainEl.removeEventListener("scroll", saveScroll);
  }, [sopId]);

  useEffect(() => {
    const saved = sessionStorage.getItem(`scroll-sop-${sopId}`);
    if (saved) {
      const mainEl = document.querySelector("main");
      if (mainEl) setTimeout(() => { mainEl.scrollTop = parseInt(saved, 10); }, 100);
    }
  }, [sopId]);

  // Close toggle blocks in view mode
  useEffect(() => {
    if (loading || !sop?.content) return;
    setTimeout(() => {
      document.querySelectorAll("details.toggle-block").forEach((el) => {
        (el as HTMLDetailsElement).removeAttribute("open");
      });
    }, 50);
  }, [sop?.content, loading]);

  // Extract footnotes from content
  const footnotes = useMemo(() => {
    if (!sop?.content) return [];
    const notes: Array<{ id: string; content: string; url: string | null }> = [];
    const find = (node: any) => {
      if (node.type === "footnoteRef") {
        notes.push({
          id: node.attrs?.noteId || String(notes.length + 1),
          content: node.attrs?.noteContent || "",
          url: node.attrs?.noteUrl || null,
        });
      }
      if (node.content) node.content.forEach(find);
    };
    find(sop.content);
    return notes;
  }, [sop?.content]);

  useEffect(() => {
    if (!isCopyProtected) return;

    function blockCopy(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "c") {
        e.preventDefault();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "p") {
        e.preventDefault();
        alert("This document is copy protected.");
      }
    }

    function blockContextMenu(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (target.closest("[data-copy-protected]")) {
        e.preventDefault();
      }
    }

    document.addEventListener("keydown", blockCopy);
    document.addEventListener("contextmenu", blockContextMenu);
    return () => {
      document.removeEventListener("keydown", blockCopy);
      document.removeEventListener("contextmenu", blockContextMenu);
    };
  }, [isCopyProtected]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-6 w-96 animate-pulse rounded bg-muted" />
        <div className="h-64 animate-pulse rounded-md border bg-muted/40" />
      </div>
    );
  }

  if (!sop) return null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Back button for wiki navigation */}
      {typeof window !== "undefined" && window.history.length > 1 && (
        <button
          type="button"
          className="no-print flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-3 w-3" /> Back
        </button>
      )}

      <h1 className="print-only text-2xl font-bold">{sop.title}</h1>

      <div className="no-print flex items-start justify-between gap-4">
        <SOPDetailHeader sop={sop} />
        <SOPDetailActions
          sop={sop}
          onTogglePin={handleTogglePin}
          onCreateChecklist={handleCreateChecklist}
          creatingChecklist={creatingChecklist}
          onDelete={handleDelete}
          deleting={deleting}
          deleteOpen={deleteOpen}
          setDeleteOpen={setDeleteOpen}
          onLoadHistory={loadHistory}
        />
      </div>

      <div className="no-print flex items-center gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          Created {formatLongDate(sop.created_at)}
        </span>
        {sop.updated_at && sop.updated_at !== sop.created_at && (
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            Updated {formatLongDate(sop.updated_at)}
            {sop.last_edited_by_name && <span>by {sop.last_edited_by_name}</span>}
          </span>
        )}
      </div>

      {isCopyProtected && (
        <div className="flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
          <Lock className="h-3.5 w-3.5" />
          This document is copy protected.
        </div>
      )}

      <Card className="border bg-card animate-fade-in">
        <CardContent
          className="py-6"
          data-copy-protected={isCopyProtected || undefined}
          style={isCopyProtected ? { userSelect: "none", WebkitUserSelect: "none" } : undefined}
        >
          {sop.content ? (
            <SOPEditor
              content={sop.content}
              editable={false}
              businessId={currentBusiness?.id}
              onNavigate={(docId) => router.push(`/dashboard/sops/${docId}`)}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">This document has no content yet.</p>
              <Link href={`/dashboard/sops/${sop.id}/edit`} className="mt-3">
                <Button variant="outline" size="sm">
                  <Edit className="mr-1 h-4 w-4" /> Add content
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {footnotes.length > 0 && (
        <div className="border-t pt-4">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">References</h3>
          <div className="space-y-1">
            {footnotes.map((fn) => (
              <div key={fn.id} className="flex items-start gap-2 text-xs">
                <span className="font-mono font-bold text-primary shrink-0">[{fn.id}]</span>
                <span className="text-muted-foreground">
                  {fn.content}
                  {fn.url && (
                    <>
                      {fn.content && " — "}
                      <a href={fn.url} className="text-primary hover:underline" target={fn.url.startsWith("/dashboard") ? "_self" : "_blank"} rel="noopener noreferrer">
                        {fn.url.startsWith("/dashboard") ? "Open document" : fn.url}
                      </a>
                    </>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {backlinks.length > 0 && (
        <div className="border-t pt-4">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Referenced by</h3>
          <div className="flex flex-wrap gap-2">
            {backlinks.map((bl) => (
              <Link key={bl.id} href={`/dashboard/sops/${bl.id}`}
                className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs hover:bg-muted transition-colors">
                <FileText className="h-3 w-3 text-muted-foreground" />
                {bl.title}
              </Link>
            ))}
          </div>
        </div>
      )}

      <VersionHistoryModal
        open={historyOpen} onOpenChange={setHistoryOpen}
        versions={versions} previewVersion={previewVersion}
        setPreviewVersion={setPreviewVersion} onRestore={restoreVersion}
      />
    </div>
  );
}
