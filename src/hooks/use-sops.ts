"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { SOP } from "@/types/sops";

export function useSops(businessId: string | undefined) {
  const [allSops, setAllSops] = useState<SOP[]>([]);
  const [trashedSops, setTrashedSops] = useState<SOP[]>([]);
  const [loading, setLoading] = useState(true);
  const lastDeletedSopIdRef = useRef<string | null>(null);
  const supabase = createClient();

  const fetchSops = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);

    const [{ data: sopsData }, { data: trashed }] = await Promise.all([
      supabase
        .from("sops")
        .select("id, title, summary, category, status, version, folder_id, doc_type, tags, pinned, created_at, updated_at, deleted_at")
        .eq("business_id", businessId)
        .is("deleted_at", null)
        .order("updated_at", { ascending: false }),
      supabase
        .from("sops")
        .select("id, title, summary, category, status, version, folder_id, doc_type, tags, pinned, created_at, updated_at, deleted_at")
        .eq("business_id", businessId)
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false }),
    ]);

    setTrashedSops(trashed ?? []);

    // Mark unread
    const { data: { user } } = await supabase.auth.getUser();
    if (user && sopsData && sopsData.length > 0) {
      const { data: reads } = await supabase
        .from("sop_reads")
        .select("sop_id")
        .eq("user_id", user.id)
        .in("sop_id", sopsData.map((s) => s.id));
      const readIds = new Set((reads ?? []).map((r) => r.sop_id));
      setAllSops(sopsData.map((s) => ({ ...s, isUnread: !readIds.has(s.id) })));
    } else {
      setAllSops(sopsData ?? []);
    }

    setLoading(false);
  }, [businessId, supabase]);

  // Ctrl+Z undo soft delete
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && lastDeletedSopIdRef.current) {
        e.preventDefault();
        handleRestore(lastDeletedSopIdRef.current);
        lastDeletedSopIdRef.current = null;
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  async function handlePin(sopId: string, pinned: boolean) {
    setAllSops((prev) => prev.map((s) => s.id === sopId ? { ...s, pinned } : s));
    const { error } = await supabase.from("sops").update({ pinned }).eq("id", sopId);
    if (error) fetchSops();
  }

  async function handleDelete(sopId: string) {
    const now = new Date().toISOString();
    setAllSops((prev) => prev.filter((s) => s.id !== sopId));
    const deleted = allSops.find((s) => s.id === sopId);
    if (deleted) setTrashedSops((prev) => [{ ...deleted, deleted_at: now }, ...prev]);
    lastDeletedSopIdRef.current = sopId;

    const { error } = await supabase.from("sops").update({ deleted_at: now }).eq("id", sopId);
    if (error) {
      toast.error(error.message);
      fetchSops();
      return;
    }
    toast("SOP moved to trash", {
      action: { label: "Undo", onClick: () => handleRestore(sopId) },
      duration: 5000,
    });
  }

  async function handleRestore(sopId: string) {
    const restored = trashedSops.find((s) => s.id === sopId);
    setTrashedSops((prev) => prev.filter((s) => s.id !== sopId));
    if (restored) setAllSops((prev) => [{ ...restored, deleted_at: null }, ...prev]);

    const { error } = await supabase.from("sops").update({ deleted_at: null }).eq("id", sopId);
    if (error) {
      toast.error(error.message);
      fetchSops();
      return;
    }
    toast.success("SOP restored");
  }

  async function handleDeleteForever(sopId: string) {
    const { error } = await supabase.from("sops").delete().eq("id", sopId);
    if (error) { toast.error(error.message); return; }
    setTrashedSops((prev) => prev.filter((s) => s.id !== sopId));
    toast.success("SOP permanently deleted");
  }

  async function handleEmptyTrash() {
    const ids = trashedSops.map((s) => s.id);
    if (ids.length === 0) return;
    const { error } = await supabase.from("sops").delete().in("id", ids);
    if (error) { toast.error(error.message); return; }
    setTrashedSops([]);
    toast.success("Trash emptied");
  }

  async function handleMove(sopId: string, targetFolderId: string, folderName?: string) {
    setAllSops((prev) => prev.map((s) => s.id === sopId ? { ...s, folder_id: targetFolderId } : s));
    toast.success(`Moved to ${folderName ?? "folder"}`);
    const { error } = await supabase.from("sops").update({ folder_id: targetFolderId }).eq("id", sopId);
    if (error) fetchSops();
  }

  async function handleDuplicate(sopId: string) {
    if (!businessId) return;
    const { data: full } = await supabase.from("sops").select("*").eq("id", sopId).single();
    if (!full) return;
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("sops").insert({
      business_id: businessId,
      title: full.title + " (Copy)",
      content: full.content,
      summary: full.summary,
      category: full.category,
      folder_id: full.folder_id,
      doc_type: full.doc_type,
      tags: full.tags,
      status: "draft",
      version: 1,
      created_by: user?.id,
    });
    fetchSops();
  }

  function handleSopMoveUp(sopId: string, unpinnedSops: SOP[]) {
    const list = [...unpinnedSops];
    const idx = list.findIndex((s) => s.id === sopId);
    if (idx <= 0) return;
    const thisTs = list[idx].updated_at;
    const aboveTs = list[idx - 1].updated_at;
    setAllSops((prev) => prev.map((s) => {
      if (s.id === list[idx].id) return { ...s, updated_at: aboveTs };
      if (s.id === list[idx - 1].id) return { ...s, updated_at: thisTs };
      return s;
    }));
    supabase.from("sops").update({ updated_at: aboveTs }).eq("id", list[idx].id).then(() => {});
    supabase.from("sops").update({ updated_at: thisTs }).eq("id", list[idx - 1].id).then(() => {});
  }

  function handleSopMoveDown(sopId: string, unpinnedSops: SOP[]) {
    const list = [...unpinnedSops];
    const idx = list.findIndex((s) => s.id === sopId);
    if (idx === -1 || idx >= list.length - 1) return;
    const thisTs = list[idx].updated_at;
    const belowTs = list[idx + 1].updated_at;
    setAllSops((prev) => prev.map((s) => {
      if (s.id === list[idx].id) return { ...s, updated_at: belowTs };
      if (s.id === list[idx + 1].id) return { ...s, updated_at: thisTs };
      return s;
    }));
    supabase.from("sops").update({ updated_at: belowTs }).eq("id", list[idx].id).then(() => {});
    supabase.from("sops").update({ updated_at: thisTs }).eq("id", list[idx + 1].id).then(() => {});
  }

  return {
    allSops,
    setAllSops,
    trashedSops,
    setTrashedSops,
    loading,
    fetchSops,
    handlePin,
    handleDelete,
    handleRestore,
    handleDeleteForever,
    handleEmptyTrash,
    handleMove,
    handleDuplicate,
    handleSopMoveUp,
    handleSopMoveDown,
  };
}
