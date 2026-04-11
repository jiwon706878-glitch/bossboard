import { createClient } from "@/lib/supabase/server";

/**
 * Check the current request's session for admin access. Used by
 * server-side API route handlers. Returns either an authorized user
 * or a failure reason the route can map to 401/403.
 */
export async function requireAdmin(): Promise<
  | { ok: true; userId: string }
  | { ok: false; reason: "unauthenticated" | "forbidden" }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, reason: "unauthenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) return { ok: false, reason: "forbidden" };

  return { ok: true, userId: user.id };
}
