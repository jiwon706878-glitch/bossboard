import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Verifies the calling user owns the target agent and returns the
 * agent row. Centralises the auth/ownership check used by both
 * PATCH and DELETE.
 */
async function requireAgentOwnership(
  agentId: string
): Promise<
  | { ok: true; userId: string }
  | { ok: false; response: NextResponse }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const admin = createAdminClient();
  const { data: agent } = await admin
    .from("profiles")
    .select("id, account_type, parent_user_id")
    .eq("id", agentId)
    .maybeSingle();

  if (!agent || agent.account_type !== "agent") {
    return {
      ok: false,
      response: NextResponse.json({ error: "not_found" }, { status: 404 }),
    };
  }

  if (agent.parent_user_id !== user.id) {
    return {
      ok: false,
      response: NextResponse.json({ error: "forbidden" }, { status: 403 }),
    };
  }

  return { ok: true, userId: user.id };
}

/**
 * PATCH /api/agents/[id]
 *
 * Updates a subset of the agent's mutable profile fields. Only the
 * parent human user can patch their own agents. account_type and
 * parent_user_id are NEVER updatable through this endpoint — that
 * would allow privilege escalation out of the agent role.
 */
export async function PATCH(req: Request, { params }: RouteParams) {
  const { id } = await params;
  const check = await requireAgentOwnership(id);
  if (!check.ok) return check.response;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const update: Record<string, unknown> = {};

  if (typeof body.name === "string" && body.name.trim()) {
    update.full_name = body.name.trim().slice(0, 100);
  }
  if (typeof body.role === "string" && body.role.trim()) {
    update.agent_role = body.role.trim().slice(0, 100);
  }
  if (
    body.preferred_model === null ||
    (typeof body.preferred_model === "string" &&
      body.preferred_model.trim().length <= 100)
  ) {
    update.preferred_model =
      typeof body.preferred_model === "string"
        ? body.preferred_model.trim() || null
        : null;
  }
  if (
    body.agent_manual_page_id === null ||
    (typeof body.agent_manual_page_id === "string" && body.agent_manual_page_id.length > 0)
  ) {
    update.agent_manual_page_id = body.agent_manual_page_id || null;
  }
  if (body.agent_permissions != null && typeof body.agent_permissions === "object") {
    // Whitelist allowed permission keys to prevent injection
    const allowed = ["can_edit_wiki", "can_post_board", "can_send_dm", "can_create_todos"];
    const perms: Record<string, boolean> = {};
    for (const key of allowed) {
      if (typeof (body.agent_permissions as Record<string, unknown>)[key] === "boolean") {
        perms[key] = (body.agent_permissions as Record<string, boolean>)[key];
      }
    }
    update.agent_permissions = perms;
  }

  // account_type, parent_user_id, agent_status, current_task,
  // last_heartbeat are deliberately NOT accepted here — status and
  // heartbeat updates go through /heartbeat, and the first two must
  // never be mutated after creation.

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "nothing_to_update" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .update(update)
    .eq("id", id)
    .eq("account_type", "agent") // belt + suspenders: never patch a human
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ agent: data });
}

/**
 * DELETE /api/agents/[id]
 *
 * Deletes the agent. We delete the auth.users row via the admin API
 * — the ON DELETE CASCADE on profiles.id and api_keys.agent_id takes
 * care of the rest, so all of the agent's keys are revoked in the
 * same transaction.
 */
export async function DELETE(_req: Request, { params }: RouteParams) {
  const { id } = await params;
  const check = await requireAgentOwnership(id);
  if (!check.ok) return check.response;

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(id);

  if (error) {
    console.error("[agents/delete] deleteUser failed", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
