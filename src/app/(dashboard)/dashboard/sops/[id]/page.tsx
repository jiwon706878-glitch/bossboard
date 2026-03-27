"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
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
import { ReadTracking } from "@/components/sops/read-tracking";

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
    signedOff, signingOff, readBy, teamSize,
    historyOpen, setHistoryOpen, versions, previewVersion, setPreviewVersion,
    handleDelete, handleCreateChecklist, handleSignOff, handleTogglePin,
    loadHistory, restoreVersion,
  } = useSopDetail(sopId);

  const isCopyProtected = sop?.copy_protected === true;

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
          </span>
        )}
      </div>

      {isCopyProtected && (
        <div className="flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
          <Lock className="h-3.5 w-3.5" />
          This document is copy protected.
        </div>
      )}

      <Card className="border bg-card">
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
              <p className="text-sm text-muted-foreground">This SOP has no content yet.</p>
              <Link href={`/dashboard/sops/${sop.id}/edit`} className="mt-3">
                <Button variant="outline" size="sm">
                  <Edit className="mr-1 h-4 w-4" /> Add content
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      <ReadTracking readBy={readBy} teamSize={teamSize} signedOff={signedOff} signingOff={signingOff} onSignOff={handleSignOff} />

      <VersionHistoryModal
        open={historyOpen} onOpenChange={setHistoryOpen}
        versions={versions} previewVersion={previewVersion}
        setPreviewVersion={setPreviewVersion} onRestore={restoreVersion}
      />
    </div>
  );
}
