"use client";

import { Button } from "@/components/ui/button";
import { FileText, Trash2, RotateCcw } from "lucide-react";
import type { SOP } from "@/types/sops";
import { formatShortDate } from "@/types/sops";

interface TrashViewProps {
  trashedSops: SOP[];
  onRestore: (sopId: string) => void;
  onDeleteForever: (sopId: string) => void;
}

export function TrashView({ trashedSops, onRestore, onDeleteForever }: TrashViewProps) {
  if (trashedSops.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
        <Trash2 className="h-10 w-10 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">Trash is empty</p>
      </div>
    );
  }

  return (
    <div>
      {trashedSops.map((sop) => (
        <div
          key={sop.id}
          className="group flex h-10 items-center gap-2 border-b border-border/30 px-4 text-sm"
        >
          <FileText className="h-4 w-4 shrink-0 text-muted-foreground/40" />
          <span className="min-w-0 flex-1 truncate text-muted-foreground">{sop.title}</span>
          <span className="shrink-0 text-xs text-muted-foreground">
            {sop.deleted_at ? formatShortDate(sop.deleted_at) : ""}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => onRestore(sop.id)}
          >
            <RotateCcw className="h-3 w-3" /> Restore
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 text-xs text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => onDeleteForever(sop.id)}
          >
            <Trash2 className="h-3 w-3" /> Delete Forever
          </Button>
        </div>
      ))}
    </div>
  );
}
