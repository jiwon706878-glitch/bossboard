import { createClient } from "@/lib/supabase/client";

interface CreateNotificationParams {
  userId: string;
  businessId?: string;
  type: string;
  title: string;
  message?: string;
  link?: string;
}

/**
 * Create an in-app notification for a user.
 * Fire-and-forget — doesn't throw on failure.
 */
export async function createNotification(params: CreateNotificationParams): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("notifications").insert({
    user_id: params.userId,
    business_id: params.businessId ?? null,
    type: params.type,
    title: params.title,
    message: params.message ?? null,
    link: params.link ?? null,
    read: false,
  });
  if (error) console.error("[notification] Insert failed:", error.code);
}

/**
 * Create notifications for all admin users.
 */
export async function notifyAdmins(params: Omit<CreateNotificationParams, "userId">): Promise<void> {
  const supabase = createClient();
  const { data: admins } = await supabase
    .from("profiles")
    .select("id")
    .eq("is_admin", true);

  if (!admins || admins.length === 0) return;

  const rows = admins.map((a: { id: string }) => ({
    user_id: a.id,
    business_id: params.businessId ?? null,
    type: params.type,
    title: params.title,
    message: params.message ?? null,
    link: params.link ?? null,
    read: false,
  }));

  const { error } = await supabase.from("notifications").insert(rows);
  if (error) console.error("[notification] Admin notify failed:", error.code);
}
