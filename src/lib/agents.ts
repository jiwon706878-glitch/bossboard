import { createAdminClient } from "@/lib/supabase/admin";
import type { PlanId } from "@/config/plans";
import {
  AGENT_LIMITS,
  type AgentLimitCheck,
} from "@/types/agents";

/**
 * Count of agent profiles owned by the given human user.
 *
 * Uses the admin client so the count isn't masked by RLS — the caller
 * is already assumed to be authenticated as `userId` by the API
 * route handler before invoking this helper.
 */
export async function getAgentCount(userId: string): Promise<number> {
  const supabase = createAdminClient();
  const { count, error } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("parent_user_id", userId)
    .eq("account_type", "agent");

  if (error) {
    console.error("[agents] getAgentCount failed", error);
    return 0;
  }
  return count ?? 0;
}

/**
 * Plan lookup. The project stores the current plan on
 * `profiles.plan_id`, updated by the Paddle webhook on subscription
 * changes. Defaults to `free` if the profile row is missing (e.g.,
 * mid-signup).
 */
export async function getUserPlan(userId: string): Promise<PlanId> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("plan_id")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data?.plan_id) return "free";

  const planId = data.plan_id as PlanId;
  if (planId in AGENT_LIMITS) return planId;
  return "free";
}

/**
 * Checks whether the user can create another agent. Combines the
 * per-plan cap with the current count.
 */
export async function canCreateAgent(
  userId: string
): Promise<AgentLimitCheck> {
  const plan = await getUserPlan(userId);
  const limit = AGENT_LIMITS[plan] ?? 0;
  const current = await getAgentCount(userId);

  return {
    allowed: current < limit,
    current,
    limit,
    plan,
  };
}

/**
 * Generates a synthetic email for an agent's auth.users row.
 *
 * We can't use the agent's profile id as the local-part because the
 * id is assigned by `auth.admin.createUser` — so this is called
 * *before* the id exists. The caller passes a fresh random slug;
 * uniqueness is all that matters (the address never receives mail).
 * The `.bossboard.local` domain is a reserved-like local suffix so
 * Supabase's email validation accepts it and real mail is never sent.
 */
export function generateAgentEmail(uniqueSlug: string): string {
  return `agent-${uniqueSlug}@agents.bossboard.local`;
}
