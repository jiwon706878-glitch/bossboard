"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Edit, Trash2, CheckSquare, Loader2, Printer, Share2, Pin, History, Copy, Check,
} from "lucide-react";
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
  const [shareOpen, setShareOpen] = useState(false);
  const [sharePassword, setSharePassword] = useState("");
  const [shareExpiry, setShareExpiry] = useState("none");
  const [shareAllowDownload, setShareAllowDownload] = useState(true);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [shareCopied, setShareCopied] = useState(false);

  async function handleCreateShareLink() {
    setShareLoading(true);
    try {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sopId: sop.id,
          password: sharePassword || undefined,
          expiresInDays: shareExpiry !== "none" ? parseInt(shareExpiry) : undefined,
          allowDownload: shareAllowDownload,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to create share link");
        setShareLoading(false);
        return;
      }
      setShareUrl(data.url);
      await navigator.clipboard.writeText(data.url);
      setShareCopied(true);
      toast.success("Share link created and copied!");
      setTimeout(() => setShareCopied(false), 3000);
    } catch {
      toast.error("Failed to create share link");
    }
    setShareLoading(false);
  }

  function handleShareClose(open: boolean) {
    setShareOpen(open);
    if (!open) {
      setShareUrl("");
      setSharePassword("");
      setShareExpiry("none");
      setShareAllowDownload(true);
      setShareCopied(false);
    }
  }

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2">
      <Button variant="outline" size="sm" onClick={onTogglePin}>
        <Pin className={cn("mr-1 h-4 w-4", sop.pinned && "text-amber-400")} />
        {sop.pinned ? "Unpin" : "Pin"}
      </Button>
      {sop.content && (
        <Button variant="outline" size="sm" onClick={onCreateChecklist} disabled={creatingChecklist}>
          {creatingChecklist ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <CheckSquare className="mr-1 h-4 w-4" />}
          Create Checklist
        </Button>
      )}
      <Button variant="outline" size="sm" onClick={() => window.print()}>
        <Printer className="mr-1 h-4 w-4" /> Print
      </Button>

      {/* Share dialog */}
      <Dialog open={shareOpen} onOpenChange={handleShareClose}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Share2 className="mr-1 h-4 w-4" /> Share
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share Document</DialogTitle>
            <DialogDescription>Create a public link anyone can view without logging in.</DialogDescription>
          </DialogHeader>

          {shareUrl ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Input value={shareUrl} readOnly className="text-sm" />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(shareUrl);
                    setShareCopied(true);
                    toast.success("Copied!");
                    setTimeout(() => setShareCopied(false), 2000);
                  }}
                >
                  {shareCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              {sharePassword && (
                <p className="text-xs text-muted-foreground">Password protected. Share the password separately.</p>
              )}
              <Button variant="outline" className="w-full" onClick={() => setShareUrl("")}>
                Create Another Link
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Password (optional)</Label>
                <Input
                  type="password"
                  value={sharePassword}
                  onChange={(e) => setSharePassword(e.target.value)}
                  placeholder="Leave empty for no password"
                />
              </div>
              <div className="space-y-2">
                <Label>Expires</Label>
                <Select value={shareExpiry} onValueChange={setShareExpiry}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Never</SelectItem>
                    <SelectItem value="1">1 day</SelectItem>
                    <SelectItem value="7">7 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="90">90 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="allow-download" className="cursor-pointer">Allow download</Label>
                <Switch id="allow-download" checked={shareAllowDownload} onCheckedChange={setShareAllowDownload} />
              </div>
              {sop.copy_protected && (
                <p className="text-xs text-muted-foreground">Copy protection will apply to the shared view.</p>
              )}
              <Button onClick={handleCreateShareLink} disabled={shareLoading} className="w-full">
                {shareLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Share2 className="mr-2 h-4 w-4" />}
                {shareLoading ? "Creating..." : "Create Share Link"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={onDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
