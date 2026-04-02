"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useBusinessStore } from "@/hooks/use-business";
import { extractStepsFromContent } from "@/lib/checklists/extract-steps";
import { toast } from "sonner";
import type { JSONContent } from "@tiptap/react";
import type { SOPDetail } from "@/types/sops";

interface VersionEntry {
  id: string;
  version: number;
  content: JSONContent;
  change_summary: string | null;
  created_at: string;
}

interface Reader {
  id: string;
  full_name: string | null;
  signed: boolean;
}

export function useSopDetail(sopId: string) {
  const [sop, setSop] = useState<SOPDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [creatingChecklist, setCreatingChecklist] = useState(false);
  const [signedOff, setSignedOff] = useState(false);
  const [signingOff, setSigningOff] = useState(false);
  const [readBy, setReadBy] = useState<Reader[]>([]);
  const [teamSize, setTeamSize] = useState(0);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [versions, setVersions] = useState<VersionEntry[]>([]);
  const [previewVersion, setPreviewVersion] = useState<JSONContent | null>(null);

  const router = useRouter();
  const supabase = createClient();
  const currentBusiness = useBusinessStore((s) => s.currentBusiness);

  const loadReadTracking = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch existing read record, all reads, and team size in parallel
    const [{ data: existing }, { data: reads }, teamSizeResult] = await Promise.all([
      supabase
        .from("sop_reads").select("id, signed")
        .eq("sop_id", sopId).eq("user_id", user.id).maybeSingle(),
      supabase.from("sop_reads").select("user_id, signed").eq("sop_id", sopId),
      currentBusiness?.id
        ? supabase.from("businesses").select("id", { count: "exact", head: true }).eq("id", currentBusiness.id)
        : Promise.resolve({ count: 1 }),
    ]);

    if (existing) {
      setSignedOff(existing.signed ?? false);
    } else {
      // Insert read record (fire-and-forget, don't block)
      supabase.from("sop_reads").insert({
        sop_id: sopId, user_id: user.id, read_at: new Date().toISOString(), signed: false,
      }).then(() => {});
    }

    if (reads && reads.length > 0) {
      const userIds = reads.map((r: any) => r.user_id);
      const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", userIds);
      const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p.full_name]));
      setReadBy(reads.map((r: any) => ({ id: r.user_id, full_name: profileMap.get(r.user_id) ?? null, signed: r.signed ?? false })));
    }

    setTeamSize(teamSizeResult?.count ?? 1);
  }, [sopId, supabase, currentBusiness?.id]);

  useEffect(() => {
    async function fetchSOP() {
      const { data, error } = await supabase.from("sops").select("id, title, content, summary, category, status, version, doc_type, tags, pinned, source_file_url, source_file_name, copy_protected, created_by, created_at, updated_at, last_edited_by_name").eq("id", sopId).single();
      if (error || !data) { toast.error("SOP not found"); router.push("/dashboard/sops"); return; }
      setSop(data);
      setLoading(false);
    }
    fetchSOP();
  }, [sopId, supabase, router]);

  useEffect(() => {
    if (!loading && sop) loadReadTracking();
  }, [loading, sop, loadReadTracking]);

  async function handleDelete() {
    setDeleting(true);
    const { error } = await supabase.from("sops").update({ deleted_at: new Date().toISOString() }).eq("id", sopId);
    if (error) { console.error("SOP delete error:", error.message); toast.error("Failed to delete SOP. Please try again."); setDeleting(false); return; }
    toast.success("SOP moved to trash");
    router.push("/dashboard/sops");
  }

  async function handleCreateChecklist() {
    if (!sop?.content) { toast.error("SOP has no content to create a checklist from"); return; }
    const businessId = currentBusiness?.id;
    if (!businessId) { toast.error("No business found"); return; }
    setCreatingChecklist(true);
    const steps = extractStepsFromContent(sop.content);
    if (steps.length === 0) { toast.error("Could not extract any steps from this SOP. Try adding numbered or bulleted steps."); setCreatingChecklist(false); return; }
    const { data: user } = await supabase.auth.getUser();
    const { data, error } = await supabase.from("checklists").insert({ business_id: businessId, sop_id: sop.id, title: `${sop.title} — Checklist`, items: steps, status: "pending", created_by: user.user?.id }).select("id").single();
    if (error) { console.error("Checklist creation error:", error.message); toast.error("Failed to create checklist. Please try again."); setCreatingChecklist(false); return; }
    toast.success(`Checklist created with ${steps.length} items`);
    router.push(`/dashboard/checklists/${data.id}`);
  }

  async function handleSignOff() {
    setSigningOff(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSigningOff(false); return; }
    const newSigned = !signedOff;
    const { error } = await supabase.from("sop_reads").update({ signed: newSigned }).eq("sop_id", sopId).eq("user_id", user.id);
    if (error) { console.error("Sign-off error:", error.message); toast.error("Failed to update sign-off. Please try again."); setSigningOff(false); return; }
    setSignedOff(newSigned);
    setReadBy((prev) => prev.map((r) => (r.id === user.id ? { ...r, signed: newSigned } : r)));
    toast.success(newSigned ? "Signed off" : "Sign-off removed");
    setSigningOff(false);
  }

  async function handleTogglePin() {
    if (!sop) return;
    const newPinned = !sop.pinned;
    const { error } = await supabase.from("sops").update({ pinned: newPinned }).eq("id", sopId);
    if (error) { console.error("Pin toggle error:", error.message); toast.error("Failed to update pin status. Please try again."); return; }
    setSop({ ...sop, pinned: newPinned });
    toast.success(newPinned ? "SOP pinned" : "SOP unpinned");
  }

  async function loadHistory() {
    const { data } = await supabase.from("sop_versions").select("id, version, content, change_summary, created_at").eq("sop_id", sopId).order("created_at", { ascending: false }).limit(3);
    setVersions(data ?? []);
    setPreviewVersion(null);
    setHistoryOpen(true);
  }

  async function restoreVersion(versionContent: JSONContent, versionNum: number) {
    if (!sop) return;
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("sop_versions").insert({ sop_id: sopId, version: sop.version, content: sop.content, changed_by: user?.id, change_summary: "Before restore" });
    const { error } = await supabase.from("sops").update({ content: versionContent, version: (sop.version ?? 1) + 1, updated_at: new Date().toISOString() }).eq("id", sopId);
    if (error) { console.error("Version restore error:", error.message); toast.error("Failed to restore version. Please try again."); return; }
    setSop({ ...sop, content: versionContent, version: (sop.version ?? 1) + 1 });
    setHistoryOpen(false);
    toast.success(`Restored to version ${versionNum}`);
  }

  return {
    sop, loading, deleteOpen, setDeleteOpen, deleting, creatingChecklist,
    signedOff, signingOff, readBy, teamSize,
    historyOpen, setHistoryOpen, versions, previewVersion, setPreviewVersion,
    handleDelete, handleCreateChecklist, handleSignOff, handleTogglePin,
    loadHistory, restoreVersion,
  };
}
