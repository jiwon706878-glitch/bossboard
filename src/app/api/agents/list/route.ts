import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canCreateAgent } from "@/lib/agents";

/**
 * GET /api/agents/list
 *
 * Lists all agent profiles owned by the current user. Also returns
 * the per-plan limit context so the UI can render "3 / 10 agents".
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select(
      "id, full_name, avatar_url, agent_role, agent_status, current_task, last_heartbeat, preferred_model, agent_manual_page_id, created_at"
    )
    .eq("account_type", "agent")
    .eq("parent_user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const limits = await canCreateAgent(user.id);

  return NextResponse.json({
    agents: data ?? [],
    limits: {
      current: limits.current,
      limit: Number.isFinite(limits.limit) ? limits.limit : null,
      plan: limits.plan,
      canCreate: limits.allowed,
    },
  });
}
