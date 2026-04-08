"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface GenerationWarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dismissChecked: boolean;
  onDismissChange: (checked: boolean) => void;
  onConfirm: () => void;
}

export function GenerationWarningDialog({
  open,
  onOpenChange,
  dismissChecked,
  onDismissChange,
  onConfirm,
}: GenerationWarningDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Before you generate</DialogTitle>
          <DialogDescription>
            AI-generated content is a draft. Please review and customize all details to match your specific business before publishing.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2 py-2">
          <Checkbox id="dismiss-warning" checked={dismissChecked} onCheckedChange={(v) => onDismissChange(v === true)} />
          <label htmlFor="dismiss-warning" className="text-sm text-muted-foreground cursor-pointer">Don&apos;t show this again</label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onConfirm}>Got it, generate</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
