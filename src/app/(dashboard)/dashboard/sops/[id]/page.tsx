"use client";

import { useEffect, useState, useCallback } from "react";
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
import { ArrowLeft, Edit, Trash2, Clock, Tag, FileText, CheckSquare, Loader2, Eye, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";
import { useBusinessStore } from "@/hooks/use-business";
import { extractStepsFromContent } from "@/lib/checklists/extract-steps";
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
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
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
              <span className="font-mono text-xs text-muted-foreground">
                v{sop.version}
              </span>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
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
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
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
      <div className="space-y-4">
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
                  className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-card text-[10px] font-bold"
                  style={{ backgroundColor: "#232840", color: "#E8ECF4" }}
                  title={`${reader.full_name ?? "User"}${reader.signed ? " (signed off)" : ""}`}
                >
                  {reader.full_name
                    ? reader.full_name.charAt(0).toUpperCase()
                    : "?"}
                </div>
              ))}
              {readBy.length > 8 && (
                <div
                  className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-card text-[10px] font-medium"
                  style={{ backgroundColor: "#1C2033", color: "#8B95B0" }}
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
              className="h-4 w-4"
              style={signedOff ? { color: "#34D399" } : undefined}
            />
          )}
          {signedOff ? "Signed Off" : "Sign Off"}
        </Button>
      </div>
    </div>
  );
}
