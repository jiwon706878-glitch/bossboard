"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ArrowLeft, Edit, Trash2, Clock, Tag, FileText, CheckSquare, Loader2, Eye, ShieldCheck, Printer, LinkIcon, Pin, History, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";
import { useBusinessStore } from "@/hooks/use-business";
import { extractStepsFromContent } from "@/lib/checklists/extract-steps";
import { format } from "date-fns";
import type { JSONContent } from "@tiptap/react";

const SOPEditor = dynamic(
  () => import("@/components/sops/sop-editor").then((m) => ({ default: m.SOPEditor })),
  { ssr: false, loading: () => <div className="rounded-md border bg-card p-4 text-sm text-muted-foreground">Loading editor...</div> }
);

interface SOP {
  id: string;
  title: string;
  content: JSONContent | null;
  summary: string | null;
  category: string | null;
  status: string;
  version: number;
  doc_type: string;
  tags: string[];
  pinned: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  published: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  archived: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function SOPDetailPage() {
  const [sop, setSop] = useState<SOP | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [creatingChecklist, setCreatingChecklist] = useState(false);
  const [signedOff, setSignedOff] = useState(false);
  const [signingOff, setSigningOff] = useState(false);
  const [readBy, setReadBy] = useState<{ id: string; full_name: string | null; signed: boolean }[]>([]);
  const [teamSize, setTeamSize] = useState(0);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [versions, setVersions] = useState<{ id: string; version: number; content: JSONContent; change_summary: string | null; created_at: string }[]>([]);
  const [previewVersion, setPreviewVersion] = useState<JSONContent | null>(null);

  const router = useRouter();
  const params = useParams();
  const supabase = createClient();
  const sopId = params.id as string;
  const currentBusiness = useBusinessStore((s) => s.currentBusiness);

  const loadReadTracking = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Record the read (upsert — don't duplicate)
    const { data: existing } = await supabase
      .from("sop_reads")
      .select("id, signed")
      .eq("sop_id", sopId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      setSignedOff(existing.signed ?? false);
    } else {
      await supabase.from("sop_reads").insert({
        sop_id: sopId,
        user_id: user.id,
        read_at: new Date().toISOString(),
        signed: false,
      });
    }

    // Fetch all reads for this SOP with profile names
    const { data: reads } = await supabase
      .from("sop_reads")
      .select("user_id, signed")
      .eq("sop_id", sopId);

    if (reads && reads.length > 0) {
      const userIds = reads.map((r) => r.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);

      const profileMap = new Map(
        (profiles ?? []).map((p) => [p.id, p.full_name])
      );

      setReadBy(
        reads.map((r) => ({
          id: r.user_id,
          full_name: profileMap.get(r.user_id) ?? null,
          signed: r.signed ?? false,
        }))
      );
    }

    // Get team size for "read by X/Y" display
    if (currentBusiness?.id) {
      const { data: members } = await supabase
        .from("profiles")
        .select("id")
        .eq("business_id", currentBusiness.id);
      setTeamSize(members?.length ?? 1);
    }
  }, [sopId, supabase, currentBusiness?.id]);

  useEffect(() => {
    async function fetchSOP() {
      const { data, error } = await supabase
        .from("sops")
        .select("*")
        .eq("id", sopId)
        .single();

      if (error || !data) {
        toast.error("SOP not found");
        router.push("/dashboard/sops");
        return;
      }
      setSop(data);
      setLoading(false);
    }
    fetchSOP();
  }, [sopId, supabase, router]);

  // Track read after SOP loads
  useEffect(() => {
    if (!loading && sop) {
      loadReadTracking();
    }
  }, [loading, sop, loadReadTracking]);

  async function handleDelete() {
    setDeleting(true);
    const { error } = await supabase.from("sops").delete().eq("id", sopId);

    if (error) {
      toast.error(error.message);
      setDeleting(false);
      return;
    }

    toast.success("SOP deleted");
    router.push("/dashboard/sops");
    router.refresh();
  }

  async function handleCreateChecklist() {
    if (!sop || !sop.content) {
      toast.error("SOP has no content to create a checklist from");
      return;
    }

    const businessId = currentBusiness?.id;
    if (!businessId) {
      toast.error("No business found");
      return;
    }

    setCreatingChecklist(true);

    const steps = extractStepsFromContent(sop.content);
    if (steps.length === 0) {
      toast.error("Could not extract any steps from this SOP. Try adding numbered or bulleted steps.");
      setCreatingChecklist(false);
      return;
    }

    const { data: user } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("checklists")
      .insert({
        business_id: businessId,
        sop_id: sop.id,
        title: `${sop.title} — Checklist`,
        items: steps,
        status: "pending",
        created_by: user.user?.id,
      })
      .select("id")
      .single();

    if (error) {
      toast.error(error.message);
      setCreatingChecklist(false);
      return;
    }

    toast.success(`Checklist created with ${steps.length} items`);
    router.push(`/dashboard/checklists/${data.id}`);
  }

  async function handleSignOff() {
    setSigningOff(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSigningOff(false);
      return;
    }

    const newSigned = !signedOff;

    const { error } = await supabase
      .from("sop_reads")
      .update({ signed: newSigned })
      .eq("sop_id", sopId)
      .eq("user_id", user.id);

    if (error) {
      toast.error(error.message);
      setSigningOff(false);
      return;
    }

    setSignedOff(newSigned);
    setReadBy((prev) =>
      prev.map((r) => (r.id === user.id ? { ...r, signed: newSigned } : r))
    );
    toast.success(newSigned ? "Signed off" : "Sign-off removed");
    setSigningOff(false);
  }

  async function handleTogglePin() {
    if (!sop) return;
    const newPinned = !sop.pinned;
    const { error } = await supabase
      .from("sops")
      .update({ pinned: newPinned })
      .eq("id", sopId);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSop({ ...sop, pinned: newPinned });
    toast.success(newPinned ? "SOP pinned" : "SOP unpinned");
  }

  async function loadHistory() {
    const { data } = await supabase
      .from("sop_versions")
      .select("id, version, content, change_summary, created_at")
      .eq("sop_id", sopId)
      .order("created_at", { ascending: false })
      .limit(3);

    setVersions(data ?? []);
    setPreviewVersion(null);
    setHistoryOpen(true);
  }

  async function restoreVersion(versionContent: JSONContent, versionNum: number) {
    if (!sop) return;

    // Save current as version first
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("sop_versions").insert({
      sop_id: sopId,
      version: sop.version,
      content: sop.content,
      changed_by: user?.id,
      change_summary: "Before restore",
    });

    // Update SOP with restored content
    const { error } = await supabase
      .from("sops")
      .update({
        content: versionContent,
        version: (sop.version ?? 1) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sopId);

    if (error) {
      toast.error(error.message);
      return;
    }

    setSop({ ...sop, content: versionContent, version: (sop.version ?? 1) + 1 });
    setHistoryOpen(false);
    toast.success(`Restored to version ${versionNum}`);
  }

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
      {/* Print-only title */}
      <h1 className="print-only text-2xl font-bold">{sop.title}</h1>

      {/* Header */}
      <div className="no-print flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Link href="/dashboard/sops">
            <Button variant="ghost" size="sm" className="mt-1">
              <ArrowLeft className="mr-1 h-4 w-4" /> Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-foreground">{sop.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge
                variant="secondary"
                className={cn("text-xs", STATUS_COLORS[sop.status])}
              >
                {sop.status}
              </Badge>
              {sop.category && (
                <Badge variant="outline" className="text-xs">
                  <Tag className="mr-1 h-3 w-3" />
                  {sop.category}
                </Badge>
              )}
              {sop.doc_type && sop.doc_type !== "sop" && (
                <Badge variant="outline" className="text-xs capitalize">
                  {sop.doc_type}
                </Badge>
              )}
              {sop.pinned && (
                <Pin className="h-3 w-3 text-amber-400" />
              )}
              <span className="font-mono text-xs text-muted-foreground">
                v{sop.version}
              </span>
            </div>
            {sop.tags && sop.tags.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {sop.tags.map((tag) => (
                  <span key={tag} className="rounded bg-accent px-1.5 py-0.5 text-[10px] text-accent-foreground">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleTogglePin}
          >
            <Pin className={cn("mr-1 h-4 w-4", sop.pinned && "text-amber-400")} />
            {sop.pinned ? "Unpin" : "Pin"}
          </Button>
          {sop.content && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCreateChecklist}
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
          <Button variant="outline" size="sm" onClick={loadHistory}>
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
                  Are you sure you want to delete &quot;{sop.title}&quot;? This action
                  cannot be undone.
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
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? "Deleting..." : "Delete"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Metadata */}
      <div className="no-print flex items-center gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          Created {formatDate(sop.created_at)}
        </span>
        {sop.updated_at && sop.updated_at !== sop.created_at && (
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            Updated {formatDate(sop.updated_at)}
          </span>
        )}
      </div>

      {/* Content */}
      <Card className="border bg-card">
        <CardContent className="py-6">
          {sop.content ? (
            <SOPEditor content={sop.content} editable={false} />
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                This SOP has no content yet.
              </p>
              <Link href={`/dashboard/sops/${sop.id}/edit`} className="mt-3">
                <Button variant="outline" size="sm">
                  <Edit className="mr-1 h-4 w-4" /> Add content
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Read Tracking & Sign-off */}
      <div className="no-print space-y-4">
        {/* Read by count + avatars */}
        {readBy.length > 0 && (
          <div className="flex items-center gap-3">
            <Eye className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Read by{" "}
              <span className="font-mono font-semibold text-foreground">
                {readBy.length}/{teamSize}
              </span>{" "}
              team {teamSize === 1 ? "member" : "members"}
            </span>
            <div className="flex -space-x-2">
              {readBy.slice(0, 8).map((reader) => (
                <div
                  key={reader.id}
                  className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-card bg-accent text-accent-foreground text-[10px] font-bold"
                  title={`${reader.full_name ?? "User"}${reader.signed ? " (signed off)" : ""}`}
                >
                  {reader.full_name
                    ? reader.full_name.charAt(0).toUpperCase()
                    : "?"}
                </div>
              ))}
              {readBy.length > 8 && (
                <div
                  className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-card bg-secondary text-muted-foreground text-[10px] font-medium"
                >
                  +{readBy.length - 8}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Sign-off button */}
        <Button
          variant={signedOff ? "secondary" : "outline"}
          size="sm"
          onClick={handleSignOff}
          disabled={signingOff}
          className="gap-2"
        >
          {signingOff ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ShieldCheck
              className={cn("h-4 w-4", signedOff && "text-emerald-400")}
            />
          )}
          {signedOff ? "Signed Off" : "Sign Off"}
        </Button>
      </div>

      {/* Version History Dialog */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
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
                      onClick={() => restoreVersion(v.content, v.version)}
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
    </div>
  );
}
