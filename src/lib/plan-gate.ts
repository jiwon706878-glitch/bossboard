import type { PlanId } from "@/config/plans";

export type Feature =
  | "dm_cloud_sync"
  | "ai_meeting_room_full"
  | "smart_search"
  | "team_workspace"
  | "more_than_3_agents"
  | "more_than_10_agents"
  | "more_than_50_agents"
  | "email_integration"
  | "mcp_client"
  | "library_cloud_sync"
  | "priority_feature_requests";

const PLAN_RANK: Record<PlanId, number> = {
  free: 0,
  starter: 1,
  pro: 2,
  business: 3,
};

const FEATURE_REQUIRES: Record<Feature, PlanId> = {
  dm_cloud_sync: "starter",
  ai_meeting_room_full: "pro",
  smart_search: "pro",
  team_workspace: "business",
  more_than_3_agents: "starter",
  more_than_10_agents: "pro",
  more_than_50_agents: "business",
  email_integration: "pro",
  mcp_client: "pro",
  library_cloud_sync: "pro",
  priority_feature_requests: "business",
};

export function isFeatureAvailable(feature: Feature, plan: PlanId): boolean {
  return PLAN_RANK[plan] >= PLAN_RANK[FEATURE_REQUIRES[feature]];
}

export function getRequiredPlan(feature: Feature): PlanId {
  return FEATURE_REQUIRES[feature];
}

export class PlanGateError extends Error {
  public readonly feature: Feature;
  public readonly requiredPlan: PlanId;

  constructor(feature: Feature) {
    const requiredPlan = FEATURE_REQUIRES[feature];
    super(`Feature "${feature}" requires the ${requiredPlan} plan or higher.`);
    this.name = "PlanGateError";
    this.feature = feature;
    this.requiredPlan = requiredPlan;
  }
}

/**
 * Throw a PlanGateError if the feature is gated for this plan. UI surfaces
 * are expected to catch and render <UpgradeModal>.
 */
export function assertFeatureAvailable(feature: Feature, plan: PlanId): void {
  if (!isFeatureAvailable(feature, plan)) {
    throw new PlanGateError(feature);
  }
}
