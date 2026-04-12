import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/dm/conversations/[id]/read
 *
 * Marks the conversation as read by the calling user — bumps their
 * own dm_participants.last_read_at row to NOW(). Idempotent. The
 * client should call this when the user opens (or returns to) the
 * thread; the unread badge in the conversation list reads from this.
 */
export async function POST(_req: Request, { params }: RouteParams) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: convId } = await params;
  const admin = createAdminClient();

  const { error } = await admin
    .from("dm_participants")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversation_id", convId)
    .eq("profile_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
