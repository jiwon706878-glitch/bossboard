import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface AgentPermissions {
  can_edit_wiki?: boolean;
  can_post_board?: boolean;
  can_send_dm?: boolean;
  can_create_todos?: boolean;
  allowed_folders?: string[] | null; // null = all, [] = none
}

/**
 * Check if the agent associated with the given API key has a specific permission.
 * Returns null if permitted, or a NextResponse 403 if denied.
 *
 * Human users (non-agent API keys) are always permitted.
 */
export async function checkAgentPermission(
  apiKeyId: string,
  permission: keyof Omit<AgentPermissions, "allowed_folders">
): Promise<NextResponse | null> {
  const admin = createAdminClient();

  // Look up the agent profile via api_keys → profiles
  const { data: keyData } = await admin
    .from("api_keys")
    .select("agent_id")
    .eq("id", apiKeyId)
    .single();

  if (!keyData?.agent_id) {
    // No agent_id means this isn't an agent key — permit
    return null;
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("account_type, agent_permissions")
    .eq("id", keyData.agent_id)
    .single();

  if (!profile) return null;

  // Human users are never restricted by agent permissions
  if (profile.account_type !== "agent") return null;

  const permissions = (profile.agent_permissions || {}) as AgentPermissions;

  if (!permissions[permission]) {
    return NextResponse.json(
      {
        error: "Permission denied",
        detail: `This agent does not have the '${permission}' permission. Ask your admin to enable it in Settings → Agents.`,
      },
      { status: 403 }
    );
  }

  return null;
}
