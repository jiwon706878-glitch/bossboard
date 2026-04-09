"use client";

import Link from "next/link";
import { HardDrive, ArrowUpCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface FileSizeLimitModalProps {
  open: boolean;
  onClose: () => void;
  fileSize: number;
  limitMb: number;
  planName: string;
  nextPlanName: string;
  nextPlanLimitMb: number;
  nextPlanStorageGb: number;
  nextPlanPrice: number;
}

function formatMb(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(1)} KB`;
}

export function FileSizeLimitModal({
  open,
  onClose,
  fileSize,
  limitMb,
  planName,
  nextPlanName,
  nextPlanLimitMb,
  nextPlanStorageGb,
  nextPlanPrice,
}: FileSizeLimitModalProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>File Too Large</DialogTitle>
          <DialogDescription>
            This file is {formatMb(fileSize)}, but your {planName} plan allows
            up to {limitMb} MB per file.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 py-2">
          <Link
            href="/developers"
            onClick={onClose}
            className="flex items-start gap-3 rounded-md border p-3 transition-colors hover:bg-muted/50"
          >
            <HardDrive className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Install BossBoard Desktop</p>
              <p className="text-xs text-muted-foreground">
                Share files of any size via local-cloud hybrid
              </p>
            </div>
          </Link>

          <Link
            href="/#pricing"
            onClick={onClose}
            className="flex items-start gap-3 rounded-md border p-3 transition-colors hover:bg-muted/50"
          >
            <ArrowUpCircle className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">
                Upgrade to {nextPlanName}
              </p>
              <p className="text-xs text-muted-foreground">
                {nextPlanLimitMb} MB per file, {nextPlanStorageGb} GB total
                &middot; ${nextPlanPrice}/month flat
              </p>
            </div>
          </Link>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
