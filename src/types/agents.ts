/**
 * Agent Account System types — BB v2.0 Day 1.
 *
 * Agents are profile rows with account_type = 'agent' owned by a
 * parent human user. They have their own auth.users entry (created
 * via auth.admin.createUser with a synthetic email) so RLS policies
 * keyed on auth.uid() work naturally.
 */

import type { PlanId } from "@/config/plans";

export type AccountType = "human" | "agent";
export type AgentStatus = "working" | "resting" | "standby" | "offline";

/**
 * Slice of the profiles table relevant to agents. The `Profile` type
 * is defined here because this codebase did not previously have a
 * central types/database.ts — existing code queries specific columns
 * inline. Importing this shape from this file keeps the agent system
 * self-contained without having to retrofit every existing query.
 */
export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  plan_id: string;
  account_type: AccountType;
  parent_user_id: string | null;
  agent_role: string | null;
  agent_status: AgentStatus;
  current_task: string | null;
  last_heartbeat: string | null;
  preferred_model: string | null;
  agent_manual_page_id: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Agent subset — same shape as Profile but with non-null agent fields
 * narrowed where the system guarantees presence (parent_user_id,
 * agent_role, agent_status).
 */
export interface AgentProfile extends Profile {
  account_type: "agent";
  parent_user_id: string;
  agent_role: string;
}

export interface CreateAgentInput {
  name: string;
  role: string;
  preferred_model?: string;
  agent_manual_page_id?: string;
}

export interface UpdateAgentInput {
  name?: string;
  role?: string;
  preferred_model?: string | null;
  agent_manual_page_id?: string | null;
}

export interface HeartbeatInput {
  status: AgentStatus;
  current_task?: string | null;
}

/** Per-plan limits for how many agents a human user can own. */
export type AgentLimits = Record<PlanId, number>;

export const AGENT_LIMITS: AgentLimits = {
  free: 3,
  starter: 10,
  pro: 50,
  // Number.POSITIVE_INFINITY is serializable as `null` in JSON responses
  // so callers can easily tell "unlimited" from a numeric cap.
  business: Number.POSITIVE_INFINITY,
};

export interface AgentLimitCheck {
  allowed: boolean;
  current: number;
  limit: number;
  plan: PlanId;
}
