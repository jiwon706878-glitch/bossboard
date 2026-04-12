import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashKey } from "@/lib/api/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Resolve the caller's authoritative profile id for a DM message.
 *
 * Two auth paths:
 *
 *   1. Session: cookie-authed human → sender_id = user.id
 *   2. Bearer bb_<key>: an agent calling its own DM API → look up
 *      api_keys.agent_id (the column added in the Day 1 migration),
 *      sender_id = that agent profile id.
 *
 * Both end up writing a `dm_messages.sender_id` that's a real
 * profiles.id, so the receiving UI doesn't need to care which path
 * was used.
 */
async function resolveSender(
  req: NextRequest
): Promise<
  | { ok: true; senderId: string; senderUserId: string; isAgent: boolean }
  | { ok: false; status: number; body: { error: string } }
> {
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) {
    const rawKey = auth.slice(7).trim();
    if (!rawKey || rawKey.length < 20) {
      return { ok: false, status: 401, body: { error: "Invalid API key" } };
    }
    const keyHash = await hashKey(rawKey);
    const admin = createAdminClient();
    const { data: keyRow } = await admin
      .from("api_keys")
      .select("id, agent_id")
      .eq("key_hash", keyHash)
      .maybeSingle();
    if (!keyRow || !keyRow.agent_id) {
      return {
        ok: false,
        status: 401,
        body: { error: "Agent API key required" },
      };
    }
    return {
      ok: true,
      senderId: keyRow.agent_id as string,
      senderUserId: keyRow.agent_id as string,
      isAgent: true,
    };
  }

  // Session path
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, status: 401, body: { error: "Unauthorized" } };
  }
  return {
    ok: true,
    senderId: user.id,
    senderUserId: user.id,
    isAgent: false,
  };
}

/**
 * GET /api/dm/conversations/[id]/messages?before=<iso>&limit=50
 *
 * Returns the most recent messages in the conversation. `before` is
 * an optional cursor (ISO timestamp) for pagination — newer-than
 * the cursor is excluded so the client can scroll up.
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  const sender = await resolveSender(req);
  if (!sender.ok) {
    return NextResponse.json(sender.body, { status: sender.status });
  }

  const { id: convId } = await params;
  const url = new URL(req.url);
  const before = url.searchParams.get("before");
  const rawLimit = parseInt(url.searchParams.get("limit") ?? "50", 10);
  const limit = Math.min(Math.max(1, isFinite(rawLimit) ? rawLimit : 50), 200);

  const admin = createAdminClient();

  // Ownership check: sender must be a participant (or own one).
  const { data: ownerProfileIds } = await admin
    .from("profiles")
    .select("id")
    .or(`id.eq.${sender.senderUserId},parent_user_id.eq.${sender.senderUserId}`);
  const profileIds = (ownerProfileIds ?? []).map((r) => r.id as string);
  // For the agent Bearer path, the sender's id is itself an agent profile.
  if (sender.isAgent) profileIds.push(sender.senderId);

  const { data: participation } = await admin
    .from("dm_participants")
    .select("id")
    .eq("conversation_id", convId)
    .in("profile_id", profileIds)
    .limit(1)
    .maybeSingle();

  if (!participation) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let query = admin
    .from("dm_messages")
    .select(
      `
        id,
        conversation_id,
        sender_id,
        content,
        attachments,
        reply_to_id,
        edited_at,
        created_at,
        sender:sender_id (
          id,
          full_name,
          avatar_url,
          account_type,
          agent_role
        )
      `
    )
    .eq("conversation_id", convId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (before) {
    query = query.lt("created_at", before);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Reverse so the client gets oldest-first within the page (typical
  // chat UI rendering order).
  const messages = (data ?? []).slice().reverse();
  return NextResponse.json({ messages });
}

/**
 * POST /api/dm/conversations/[id]/messages
 * Body: { content: string; reply_to_id?: string }
 *
 * Sends a message. Auth via session OR Bearer agent key (see
 * resolveSender above). The sender must already be a participant.
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  const sender = await resolveSender(req);
  if (!sender.ok) {
    return NextResponse.json(sender.body, { status: sender.status });
  }

  const { id: convId } = await params;

  let body: { content?: unknown; reply_to_id?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const content =
    typeof body.content === "string" ? body.content.trim() : "";
  if (!content) {
    return NextResponse.json({ error: "content_required" }, { status: 400 });
  }
  if (content.length > 10000) {
    return NextResponse.json({ error: "content_too_long" }, { status: 400 });
  }

  const replyToId =
    typeof body.reply_to_id === "string" && body.reply_to_id
      ? body.reply_to_id
      : null;

  const admin = createAdminClient();

  // Ownership check
  const { data: ownerProfileIds } = await admin
    .from("profiles")
    .select("id")
    .or(`id.eq.${sender.senderUserId},parent_user_id.eq.${sender.senderUserId}`);
  const profileIds = (ownerProfileIds ?? []).map((r) => r.id as string);
  if (sender.isAgent) profileIds.push(sender.senderId);

  const { data: participation } = await admin
    .from("dm_participants")
    .select("id")
    .eq("conversation_id", convId)
    .in("profile_id", profileIds)
    .limit(1)
    .maybeSingle();

  if (!participation) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { data: msg, error } = await admin
    .from("dm_messages")
    .insert({
      conversation_id: convId,
      sender_id: sender.senderId,
      content,
      reply_to_id: replyToId,
    })
    .select(
      `
        id,
        conversation_id,
        sender_id,
        content,
        attachments,
        reply_to_id,
        edited_at,
        created_at
      `
    )
    .single();

  if (error || !msg) {
    return NextResponse.json(
      { error: error?.message ?? "send_failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ message: msg }, { status: 201 });
}
