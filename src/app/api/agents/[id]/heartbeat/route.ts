import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashKey } from "@/lib/api/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/agents/[id]/heartbeat
 *
 * Called BY the agent itself using its own API key in the
 * Authorization header. Updates the agent's status, current task,
 * and last_heartbeat timestamp. The server verifies:
 *
 *   1. A valid API key is present
 *   2. The key belongs to the agent identified by :id (api_keys.agent_id)
 *
 * This prevents an agent from updating another agent's status with
 * its own key, even within the same business.
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  const { id: agentId } = await params;

  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Missing Authorization header" },
      { status: 401 }
    );
  }

  const rawKey = authHeader.slice(7);
  if (!rawKey || rawKey.length < 20) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  const keyHash = await hashKey(rawKey);
  const admin = createAdminClient();

  // Look up the API key and verify it belongs to this agent
  const { data: key, error: keyErr } = await admin
    .from("api_keys")
    .select("id, agent_id, business_id")
    .eq("key_hash", keyHash)
    .maybeSingle();

  if (keyErr || !key) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  if (key.agent_id !== agentId) {
    return NextResponse.json(
      { error: "Key does not belong to this agent" },
      { status: 403 }
    );
  }

  // Parse body
  let body: { status?: unknown; current_task?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const status = body.status;
  const ALLOWED_STATUSES = [
    "working",
    "resting",
    "standby",
    "offline",
  ] as const;
  if (
    typeof status !== "string" ||
    !ALLOWED_STATUSES.includes(status as (typeof ALLOWED_STATUSES)[number])
  ) {
    return NextResponse.json(
      { error: "Invalid status", allowed: ALLOWED_STATUSES },
      { status: 400 }
    );
  }

  const currentTask =
    typeof body.current_task === "string"
      ? body.current_task.slice(0, 500)
      : body.current_task === null
        ? null
        : undefined;

  const update: Record<string, unknown> = {
    agent_status: status,
    last_heartbeat: new Date().toISOString(),
  };
  if (currentTask !== undefined) update.current_task = currentTask;

  const { data, error } = await admin
    .from("profiles")
    .update(update)
    .eq("id", agentId)
    .eq("account_type", "agent")
    .select("id, agent_status, current_task, last_heartbeat")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fire-and-forget last_used_at update on the API key
  admin
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", key.id)
    .then(() => {});

  return NextResponse.json({ ok: true, agent: data });
}
