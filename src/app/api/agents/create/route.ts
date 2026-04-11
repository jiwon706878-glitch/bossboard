import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  canCreateAgent,
  generateAgentEmail,
  getAgentCount,
} from "@/lib/agents";
import { hashKey } from "@/lib/api/auth";

/**
 * POST /api/agents/create
 *
 * Creates an agent account owned by the current human user and mints
 * an API key the agent will use for future requests.
 *
 * Two-step process because profiles.id FKs to auth.users(id):
 *   1. auth.admin.createUser() with a synthetic email + user_metadata
 *      carrying account_type='agent', parent_user_id, agent_role, etc.
 *      The existing handle_new_user() trigger (extended in the
 *      agent_accounts migration) reads that metadata and creates the
 *      profile row atomically.
 *   2. Generate a raw API key, hash it, insert into api_keys tied to
 *      the agent_id + the parent user's first business. The raw key
 *      is returned ONCE in the response body.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { name?: unknown; role?: unknown; preferred_model?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const role = typeof body.role === "string" ? body.role.trim() : "";
  if (!name || !role) {
    return NextResponse.json(
      { error: "Name and role required" },
      { status: 400 }
    );
  }
  if (name.length > 100 || role.length > 100) {
    return NextResponse.json({ error: "name_or_role_too_long" }, { status: 400 });
  }

  const preferredModel =
    typeof body.preferred_model === "string" && body.preferred_model.trim()
      ? body.preferred_model.trim()
      : null;

  // Enforce plan limit
  const limitCheck = await canCreateAgent(user.id);
  if (!limitCheck.allowed) {
    return NextResponse.json(
      {
        error: "Agent limit reached",
        current: limitCheck.current,
        limit: Number.isFinite(limitCheck.limit) ? limitCheck.limit : null,
        plan: limitCheck.plan,
      },
      { status: 403 }
    );
  }

  const admin = createAdminClient();

  // Find the parent user's first business — agent API keys are still
  // scoped to a business in the existing api_keys schema so activity
  // logging works. If the user has no business yet, refuse.
  const { data: business } = await admin
    .from("businesses")
    .select("id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!business) {
    return NextResponse.json(
      { error: "no_business", message: "Create a business before adding agents" },
      { status: 400 }
    );
  }

  // Synthetic email — needs to be unique. Use crypto.randomUUID so we
  // don't collide even on fast concurrent creates.
  const tempSlug = crypto.randomUUID();
  const email = generateAgentEmail(tempSlug);

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: {
      full_name: name,
      account_type: "agent",
      parent_user_id: user.id,
      agent_role: role,
      preferred_model: preferredModel,
    },
  });

  if (createErr || !created?.user) {
    console.error("[agents/create] admin.createUser failed", createErr);
    return NextResponse.json(
      { error: createErr?.message ?? "failed_to_create_agent" },
      { status: 500 }
    );
  }

  const agentId = created.user.id;

  // Fetch the profile row the trigger just created so we can return it
  const { data: agent, error: fetchErr } = await admin
    .from("profiles")
    .select("*")
    .eq("id", agentId)
    .single();

  if (fetchErr || !agent) {
    console.error("[agents/create] profile fetch failed", fetchErr);
    // Roll back the auth user so we don't leak orphan identities
    await admin.auth.admin.deleteUser(agentId);
    return NextResponse.json(
      { error: "agent_profile_not_found" },
      { status: 500 }
    );
  }

  // TOCTOU guard: two concurrent creates can both pass the initial
  // `canCreateAgent` check. After the insert is committed, re-count;
  // if the user is now over cap, roll this agent back. The caller
  // can retry and one of the racing requests will succeed.
  if (Number.isFinite(limitCheck.limit)) {
    const postCount = await getAgentCount(user.id);
    if (postCount > limitCheck.limit) {
      await admin.auth.admin.deleteUser(agentId);
      return NextResponse.json(
        {
          error: "Agent limit reached",
          current: limitCheck.limit,
          limit: limitCheck.limit,
          plan: limitCheck.plan,
        },
        { status: 403 }
      );
    }
  }

  // Mint the agent's API key
  const rawKey = `bb_${crypto.randomUUID().replace(/-/g, "")}`;
  const keyHash = await hashKey(rawKey);
  const keyPrefix = rawKey.substring(0, 10);

  const { data: keyRow, error: keyErr } = await admin
    .from("api_keys")
    .insert({
      business_id: business.id,
      agent_id: agentId,
      key_hash: keyHash,
      key_prefix: keyPrefix,
      name: `${name} (agent)`,
      created_by: user.id,
    })
    .select("id, name, key_prefix, created_at")
    .single();

  if (keyErr) {
    console.error("[agents/create] api_keys insert failed", keyErr);
    // Roll back the auth user + profile
    await admin.auth.admin.deleteUser(agentId);
    return NextResponse.json(
      { error: "failed_to_create_key" },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      agent,
      apiKey: {
        key: rawKey, // returned ONCE — store it now or lose it
        id: keyRow.id,
        name: keyRow.name,
        prefix: keyRow.key_prefix,
        created_at: keyRow.created_at,
      },
    },
    { status: 201 }
  );
}
