"use client";

import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RotateCcw } from "lucide-react";
import { format } from "date-fns";
import dynamic from "next/dynamic";
import type { JSONContent } from "@tiptap/react";

const SOPEditor = dynamic(
  () => import("@/components/sops/sop-editor").then((m) => ({ default: m.SOPEditor })),
  { ssr: false, loading: () => <div className="rounded-md border bg-card p-4 text-sm text-muted-foreground">Loading editor...</div> }
);

interface VersionEntry {
  id: string;
  version: number;
  content: JSONContent;
  change_summary: string | null;
  created_at: string;
}

interface VersionHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  versions: VersionEntry[];
  previewVersion: JSONContent | null;
  setPreviewVersion: (v: JSONContent | null) => void;
  onRestore: (content: JSONContent, versionNum: number) => void;
}

export function VersionHistoryModal({
  open,
  onOpenChange,
  versions,
  previewVersion,
  setPreviewVersion,
  onRestore,
}: VersionHistoryModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Version History</DialogTitle>
        </DialogHeader>
        {versions.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">No previous versions found.</p>
        ) : (
          <div className="space-y-3 pt-2">
            {versions.map((v) => (
              <div key={v.id} className="rounded-md border p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-mono text-sm font-semibold">v{v.version}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {v.change_summary}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {format(new Date(v.created_at), "MMM d, h:mm a")}
                  </span>
                </div>
                <div className="mt-2 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => setPreviewVersion(previewVersion === v.content ? null : v.content)}
                  >
                    {previewVersion === v.content ? "Hide Preview" : "Preview"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs gap-1"
                    onClick={() => onRestore(v.content, v.version)}
                  >
                    <RotateCcw className="h-3 w-3" /> Restore
                  </Button>
                </div>
                {previewVersion === v.content && (
                  <div className="mt-3 rounded border p-3">
                    <Suspense fallback={<div className="text-sm text-muted-foreground">Loading...</div>}>
                      <SOPEditor content={v.content} editable={false} />
                    </Suspense>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
