"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Edit, Trash2, CheckSquare, Loader2, Printer, LinkIcon, Pin, History } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { SOPDetail } from "@/types/sops";

interface SOPDetailActionsProps {
  sop: SOPDetail;
  onTogglePin: () => void;
  onCreateChecklist: () => void;
  creatingChecklist: boolean;
  onDelete: () => void;
  deleting: boolean;
  deleteOpen: boolean;
  setDeleteOpen: (open: boolean) => void;
  onLoadHistory: () => void;
}

export function SOPDetailActions({
  sop,
  onTogglePin,
  onCreateChecklist,
  creatingChecklist,
  onDelete,
  deleting,
  deleteOpen,
  setDeleteOpen,
  onLoadHistory,
}: SOPDetailActionsProps) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={onTogglePin}
      >
        <Pin className={cn("mr-1 h-4 w-4", sop.pinned && "text-amber-400")} />
        {sop.pinned ? "Unpin" : "Pin"}
      </Button>
      {sop.content && (
        <Button
          variant="outline"
          size="sm"
          onClick={onCreateChecklist}
          disabled={creatingChecklist}
        >
          {creatingChecklist ? (
            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
          ) : (
            <CheckSquare className="mr-1 h-4 w-4" />
          )}
          Create Checklist
        </Button>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={() => window.print()}
      >
        <Printer className="mr-1 h-4 w-4" /> Print / PDF
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          navigator.clipboard.writeText(window.location.href);
          toast.success("Link copied!");
        }}
      >
        <LinkIcon className="mr-1 h-4 w-4" /> Share
      </Button>
      <Button variant="outline" size="sm" onClick={onLoadHistory}>
        <History className="mr-1 h-4 w-4" /> History
      </Button>
      <Link href={`/dashboard/sops/${sop.id}/edit`}>
        <Button variant="outline" size="sm">
          <Edit className="mr-1 h-4 w-4" /> Edit
        </Button>
      </Link>
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="text-destructive">
            <Trash2 className="mr-1 h-4 w-4" /> Delete
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete SOP</DialogTitle>
            <DialogDescription>
              &quot;{sop.title}&quot; will be moved to trash. You can restore it later.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={onDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
