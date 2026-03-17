"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Edit, FileText, Clock } from "lucide-react";
import dynamic from "next/dynamic";
import { formatLongDate } from "@/types/sops";
import { useSopDetail } from "@/hooks/use-sop-detail";
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
  const sopId = params.id as string;
  const {
    sop, loading, deleteOpen, setDeleteOpen, deleting, creatingChecklist,
    signedOff, signingOff, readBy, teamSize,
    historyOpen, setHistoryOpen, versions, previewVersion, setPreviewVersion,
    handleDelete, handleCreateChecklist, handleSignOff, handleTogglePin,
    loadHistory, restoreVersion,
  } = useSopDetail(sopId);

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

      <Card className="border bg-card">
        <CardContent className="py-6">
          {sop.content ? (
            <SOPEditor content={sop.content} editable={false} />
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
