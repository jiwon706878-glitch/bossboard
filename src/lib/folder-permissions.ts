import type { SupabaseClient } from "@supabase/supabase-js";

export type FolderPermission = "read" | "write" | "admin" | "denied";

/**
 * Resolve the effective permission for a user or API key on a given folder.
 *
 * Precedence:
 *   1. Business owner → always 'admin'
 *   2. Explicit folder_permissions entry for this user/key
 *   3. Business member → 'write' (default)
 *   4. Neither → 'denied'
 */
export async function getFolderPermission(
  supabase: SupabaseClient,
  folderId: string,
  opts: { userId?: string; apiKeyId?: string },
): Promise<FolderPermission> {
  const { userId, apiKeyId } = opts;
  if (!userId && !apiKeyId) return "denied";

  // 1. Check if user is business owner
  if (userId) {
    const { data: folder } = await supabase
      .from("folders")
      .select("business_id, businesses!inner(user_id)")
      .eq("id", folderId)
      .single();
    if (folder) {
      const biz = folder.businesses as unknown as { user_id: string } | null;
      if (biz?.user_id === userId) return "admin";
    }
  }

  // 2. Check explicit permission entry
  let query = supabase
    .from("folder_permissions")
    .select("permission")
    .eq("folder_id", folderId);

  if (userId) {
    query = query.eq("user_id", userId);
  } else if (apiKeyId) {
    query = query.eq("api_key_id", apiKeyId);
  }

  const { data: explicit } = await query.maybeSingle();
  if (explicit?.permission) {
    return explicit.permission as FolderPermission;
  }

  // 3. Fallback: business member → write (API keys default to read)
  if (userId) {
    const { data: folder } = await supabase
      .from("folders")
      .select("business_id")
      .eq("id", folderId)
      .single();
    if (folder) {
      const { data: member } = await supabase
        .from("business_members")
        .select("user_id")
        .eq("business_id", folder.business_id)
        .eq("user_id", userId)
        .maybeSingle();
      if (member) return "write";
    }
  }

  if (apiKeyId) {
    // API keys default to read unless explicitly denied or granted write/admin
    return "read";
  }

  return "denied";
}

/**
 * Guard helper that throws if the target lacks required permission.
 * Use in API routes:
 *
 *   await requireFolderPermission(supabase, folderId, { userId }, "write");
 */
export async function requireFolderPermission(
  supabase: SupabaseClient,
  folderId: string,
  opts: { userId?: string; apiKeyId?: string },
  required: FolderPermission,
): Promise<void> {
  const actual = await getFolderPermission(supabase, folderId, opts);

  if (actual === "denied") {
    throw new Error("Access denied to folder");
  }

  // Permission levels: read < write < admin
  const levels: Record<FolderPermission, number> = {
    denied: 0,
    read: 1,
    write: 2,
    admin: 3,
  };

  if (levels[actual] < levels[required]) {
    throw new Error(
      `Insufficient permission: required ${required}, have ${actual}`,
    );
  }
}
