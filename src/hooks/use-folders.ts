"use client";

import { useCallback, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { FolderRow, SOP } from "@/types/sops";

export function useFolders(businessId: string | undefined) {
  const [folders, setFolders] = useState<FolderRow[]>([]);
  const supabase = createClient();

  const fetchFolders = useCallback(async () => {
    if (!businessId) return [];
    const { data: allFolders } = await supabase
      .from("folders")
      .select("id, name, parent_id")
      .eq("business_id", businessId);
    setFolders(allFolders ?? []);
    return allFolders ?? [];
  }, [businessId, supabase]);

  async function handleCreateFolder(name: string) {
    if (!businessId || !name.trim()) return null;
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase
      .from("folders")
      .insert({
        business_id: businessId,
        name: name.trim(),
        parent_id: null,
        sort_order: folders.length,
        created_by: user?.id,
      })
      .select("id")
      .single();
    toast.success(`Folder "${name.trim()}" created`);
    return data?.id ?? null;
  }

  async function handleRenameFolder(folderId: string) {
    const folder = folders.find((f) => f.id === folderId);
    if (!folder) return;
    const name = prompt("Rename folder:", folder.name);
    if (!name?.trim() || name.trim() === folder.name) return;
    setFolders((prev) => prev.map((f) => f.id === folderId ? { ...f, name: name.trim() } : f));
    await supabase.from("folders").update({ name: name.trim() }).eq("id", folderId);
  }

  async function handleDeleteFolder(folderId: string) {
    setFolders((prev) => prev.filter((f) => f.id !== folderId));
    await supabase.from("folders").delete().eq("id", folderId);
  }

  function handleFolderMoveUp(folderId: string) {
    const roots = folders.filter((f) => !f.parent_id);
    const idx = roots.findIndex((f) => f.id === folderId);
    if (idx <= 0) return;
    const nonRoots = folders.filter((f) => f.parent_id);
    [roots[idx], roots[idx - 1]] = [roots[idx - 1], roots[idx]];
    setFolders([...roots, ...nonRoots]);
    supabase.from("folders").update({ sort_order: idx - 1 }).eq("id", roots[idx - 1].id).then(() => {});
    supabase.from("folders").update({ sort_order: idx }).eq("id", roots[idx].id).then(() => {});
  }

  function handleFolderMoveDown(folderId: string) {
    const roots = folders.filter((f) => !f.parent_id);
    const idx = roots.findIndex((f) => f.id === folderId);
    if (idx === -1 || idx >= roots.length - 1) return;
    const nonRoots = folders.filter((f) => f.parent_id);
    [roots[idx], roots[idx + 1]] = [roots[idx + 1], roots[idx]];
    setFolders([...roots, ...nonRoots]);
    supabase.from("folders").update({ sort_order: idx }).eq("id", roots[idx].id).then(() => {});
    supabase.from("folders").update({ sort_order: idx + 1 }).eq("id", roots[idx + 1].id).then(() => {});
  }

  async function handleDropOnFolder(
    targetFolderId: string,
    e: React.DragEvent,
    setAllSops: React.Dispatch<React.SetStateAction<SOP[]>>,
    fetchSops: () => Promise<void>
  ) {
    e.preventDefault();
    const sopId = e.dataTransfer.getData("text/plain");
    if (!sopId) return;
    setAllSops((prev) => prev.map((s) => s.id === sopId ? { ...s, folder_id: targetFolderId } : s));
    toast.success("SOP moved");
    const { error } = await supabase.from("sops").update({ folder_id: targetFolderId }).eq("id", sopId);
    if (error) fetchSops();
  }

  return {
    folders,
    setFolders,
    fetchFolders,
    handleCreateFolder,
    handleRenameFolder,
    handleDeleteFolder,
    handleFolderMoveUp,
    handleFolderMoveDown,
    handleDropOnFolder,
  };
}
