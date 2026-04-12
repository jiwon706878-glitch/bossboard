import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { findExistingOneToOne } from "@/lib/dm";

/**
 * GET /api/dm/conversations
 *
 * Lists conversations the calling user participates in, ordered by
 * last_message_at desc. Each row includes a flattened participant
 * array (so the client can render names/avatars without a join) and
 * an `unread` boolean computed from the caller's last_read_at vs
 * the conversation's last_message_at.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Use the admin client because RLS on dm_conversations only returns
  // rows the caller participates in via the SECURITY DEFINER helper.
  // We do the participation filter explicitly here so we can JOIN
  // participants + last-read in one shot.
  const admin = createAdminClient();

  // 1. Find all conversation ids the user (or any of their agents)
  //    participates in.
  const { data: ownAndAgentIds } = await admin
    .from("profiles")
    .select("id")
    .or(`id.eq.${user.id},parent_user_id.eq.${user.id}`);

  const profileIds = (ownAndAgentIds ?? []).map((r) => r.id as string);
  if (profileIds.length === 0) {
    return NextResponse.json({ conversations: [] });
  }

  const { data: myParticipations } = await admin
    .from("dm_participants")
    .select("conversation_id, profile_id, last_read_at")
    .in("profile_id", profileIds);

  const convIds = Array.from(
    new Set((myParticipations ?? []).map((r) => r.conversation_id as string))
  );
  if (convIds.length === 0) {
    return NextResponse.json({ conversations: [] });
  }

  // 2. Fetch the conversations + all participants (so the client can
  //    render names without a follow-up call).
  const { data: convs, error: convErr } = await admin
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
    .in("id", convIds)
    .order("last_message_at", { ascending: false });

  if (convErr || !convs) {
    return NextResponse.json({ error: convErr?.message ?? "failed" }, { status: 500 });
  }

  // 3. Compute unread per conv based on the caller's last_read_at.
  const myReads = new Map<string, string>();
  for (const p of myParticipations ?? []) {
    if (profileIds.includes(p.profile_id as string)) {
      myReads.set(p.conversation_id as string, p.last_read_at as string);
    }
  }

  const conversations = (convs as Array<Record<string, unknown>>).map((c) => {
    const lastRead = myReads.get(c.id as string);
    const unread = lastRead
      ? new Date(c.last_message_at as string) > new Date(lastRead)
      : true;
    return { ...c, unread };
  });

  return NextResponse.json({ conversations });
}

/**
 * POST /api/dm/conversations
 * Body: { participant_ids: string[]; is_group?: boolean; title?: string }
 *
 * Creates a new DM conversation with the calling user + the given
 * participant_ids. For 1:1 (single participant_id, is_group=false),
 * tries to reuse any existing 1:1 between the same pair instead of
 * creating a duplicate.
 *
 * The caller is automatically added as a participant. participant_ids
 * must be other profiles (humans or agents) in the same business as
 * the caller — we look up the caller's first business to scope.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    participant_ids?: unknown;
    is_group?: unknown;
    title?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const participantIds = Array.isArray(body.participant_ids)
    ? (body.participant_ids as unknown[]).filter(
        (p): p is string => typeof p === "string" && p.length > 0
      )
    : [];
  if (participantIds.length === 0) {
    return NextResponse.json(
      { error: "participant_ids required" },
      { status: 400 }
    );
  }

  const isGroup = body.is_group === true || participantIds.length > 1;
  const title =
    typeof body.title === "string" ? body.title.slice(0, 200) : null;

  const admin = createAdminClient();

  // Resolve the caller's primary business (DMs are workspace-scoped).
  const { data: business } = await admin
    .from("businesses")
    .select("id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!business) {
    return NextResponse.json(
      { error: "no_business", message: "Create a business before sending DMs" },
      { status: 400 }
    );
  }

  // For 1:1, check for an existing conversation first.
  if (!isGroup && participantIds.length === 1) {
    const existing = await findExistingOneToOne(
      business.id,
      user.id,
      participantIds[0]
    );
    if (existing) {
      return NextResponse.json({ conversation_id: existing, reused: true });
    }
  }

  // Create the conversation row.
  const { data: conv, error: convErr } = await admin
    .from("dm_conversations")
    .insert({
      business_id: business.id,
      created_by: user.id,
      is_group: isGroup,
      title,
    })
    .select("id")
    .single();

  if (convErr || !conv) {
    return NextResponse.json(
      { error: convErr?.message ?? "create_failed" },
      { status: 500 }
    );
  }

  // Insert participants (caller + invitees). Dedupe in case the
  // caller passed themselves in by mistake.
  const allIds = Array.from(new Set([user.id, ...participantIds]));
  const { error: partErr } = await admin
    .from("dm_participants")
    .insert(allIds.map((pid) => ({ conversation_id: conv.id, profile_id: pid })));

  if (partErr) {
    // Roll back the conversation row so we don't leak orphans.
    await admin.from("dm_conversations").delete().eq("id", conv.id);
    return NextResponse.json(
      { error: partErr.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ conversation_id: conv.id, reused: false }, { status: 201 });
}
