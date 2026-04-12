import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/dm/conversations/[id]
 *
 * Returns the conversation row + the full participants list with
 * profile metadata. The caller must be a participant (or own an
 * agent that is); otherwise 403.
 */
export async function GET(_req: Request, { params }: RouteParams) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const admin = createAdminClient();

  // Ownership check: caller or any of their agents must be a participant.
  const { data: ownerProfileIds } = await admin
    .from("profiles")
    .select("id")
    .or(`id.eq.${user.id},parent_user_id.eq.${user.id}`);

  const profileIds = (ownerProfileIds ?? []).map((r) => r.id as string);
  if (profileIds.length === 0) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { data: participation } = await admin
    .from("dm_participants")
    .select("id")
    .eq("conversation_id", id)
    .in("profile_id", profileIds)
    .limit(1)
    .maybeSingle();

  if (!participation) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { data: conv, error } = await admin
    .from("dm_conversations")
    .select(
      `
        id,
        business_id,
        created_by,
        is_group,
        title,
        last_message_at,
        created_at,
        dm_participants (
          profile_id,
          last_read_at,
          joined_at,
          profiles:profile_id (
            id,
            full_name,
            avatar_url,
            account_type,
            agent_role
          )
        )
      `
    )
    .eq("id", id)
    .single();

  if (error || !conv) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({ conversation: conv });
}
