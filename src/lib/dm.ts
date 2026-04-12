import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Shared helpers for the DM routes. The actual auth + RLS lives in
 * the routes themselves; this file is just data-shape utilities so
 * the route handlers stay short.
 */

export interface DmConversationRow {
  id: string;
  business_id: string;
  created_by: string | null;
  is_group: boolean;
  title: string | null;
  last_message_at: string;
  created_at: string;
}

export interface DmParticipantRow {
  id: string;
  conversation_id: string;
  profile_id: string;
  last_read_at: string;
  joined_at: string;
}

export interface DmMessageRow {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  content: string;
  attachments: unknown;
  reply_to_id: string | null;
  edited_at: string | null;
  created_at: string;
}

/**
 * For 1:1 DMs we want to look up an existing conversation between
 * two profiles before creating a new one — otherwise users would
 * pile up duplicate threads on every "Message <name>" click.
 *
 * Returns the conversation id if a 1:1 already exists between
 * exactly these two profiles inside the given business, else null.
 *
 * Uses the admin client because the RLS policies hide conversations
 * the caller doesn't participate in (which is what we WANT for
 * normal queries, but here we're explicitly looking up on behalf
 * of an authenticated user who's about to be added).
 */
export async function findExistingOneToOne(
  businessId: string,
  profileA: string,
  profileB: string
): Promise<string | null> {
  if (profileA === profileB) return null;
  const supabase = createAdminClient();

  // Find conversations in this business that have profileA AND profileB
  // and are NOT group conversations. The simplest correct query is to
  // intersect the two participant rows, then filter to non-group convs
  // that have exactly 2 participants total.
  const { data, error } = await supabase
    .from("dm_conversations")
    .select(
      `
        id,
        is_group,
        business_id,
        dm_participants!inner(profile_id)
      `
    )
    .eq("business_id", businessId)
    .eq("is_group", false);

  if (error || !data) return null;

  for (const conv of data as Array<{
    id: string;
    is_group: boolean;
    dm_participants: Array<{ profile_id: string }>;
  }>) {
    const ids = new Set(conv.dm_participants.map((p) => p.profile_id));
    if (ids.size === 2 && ids.has(profileA) && ids.has(profileB)) {
      return conv.id;
    }
  }
  return null;
}
