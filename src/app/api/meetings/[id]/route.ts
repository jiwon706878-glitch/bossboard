import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/meetings/[id] — Get meeting detail + messages + participants
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();

    // Get meeting
    const { data: meeting, error: meetingError } = await admin
      .from("meetings")
      .select("*")
      .eq("id", id)
      .single();

    if (meetingError || !meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    // Verify user has access to this business
    const { data: membership } = await admin
      .from("business_members")
      .select("user_id")
      .eq("business_id", meeting.business_id)
      .eq("user_id", user.id)
      .maybeSingle();

    const { data: ownedBiz } = await admin
      .from("businesses")
      .select("id")
      .eq("id", meeting.business_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership && !ownedBiz) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get messages ordered by message_order
    const { data: messages } = await admin
      .from("meeting_messages")
      .select("id, sender_id, content, message_order, created_at")
      .eq("meeting_id", id)
      .order("message_order", { ascending: true });

    // Get participants with profile info
    const { data: participants } = await admin
      .from("meeting_participants")
      .select("id, profile_id, role, profiles:profile_id(id, full_name, avatar_url, agent_role)")
      .eq("meeting_id", id);

    return NextResponse.json({
      meeting,
      messages: messages ?? [],
      participants: participants ?? [],
    });
  } catch (error) {
    console.error("Meeting GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
