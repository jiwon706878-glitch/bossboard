import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/meetings — List meetings for current user's business
 */
export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get("business_id");
    if (!businessId) {
      return NextResponse.json({ error: "business_id is required" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Verify user belongs to this business
    const { data: membership } = await admin
      .from("business_members")
      .select("user_id")
      .eq("business_id", businessId)
      .eq("user_id", user.id)
      .maybeSingle();

    const { data: ownedBiz } = await admin
      .from("businesses")
      .select("id")
      .eq("id", businessId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership && !ownedBiz) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: meetings, error } = await admin
      .from("meetings")
      .select("id, title, topic, status, created_by, conclusion, approved_at, created_at, updated_at, meeting_participants(count)")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Flatten participant count
    const result = (meetings ?? []).map((m: Record<string, unknown>) => {
      const participants = m.meeting_participants as Array<{ count: number }> | undefined;
      const participantCount = participants?.[0]?.count ?? 0;
      const { meeting_participants: _, ...rest } = m;
      return { ...rest, participant_count: participantCount };
    });

    return NextResponse.json({ meetings: result });
  } catch (error) {
    console.error("Meetings GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/meetings — Create a new meeting
 */
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { title, topic, participant_ids, business_id } = body;

    if (!title || !topic || !business_id) {
      return NextResponse.json({ error: "title, topic, and business_id are required" }, { status: 400 });
    }

    if (!Array.isArray(participant_ids) || participant_ids.length === 0) {
      return NextResponse.json({ error: "At least one participant is required" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Verify user owns or is member of this business
    const { data: ownedBiz } = await admin
      .from("businesses")
      .select("id")
      .eq("id", business_id)
      .eq("user_id", user.id)
      .maybeSingle();

    const { data: membership } = await admin
      .from("business_members")
      .select("user_id")
      .eq("business_id", business_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!ownedBiz && !membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Create meeting
    const { data: meeting, error: meetingError } = await admin
      .from("meetings")
      .insert({
        business_id,
        title: title.trim(),
        topic: topic.trim(),
        created_by: user.id,
      })
      .select("*")
      .single();

    if (meetingError) {
      return NextResponse.json({ error: meetingError.message }, { status: 500 });
    }

    // Create participants
    const participantRows = participant_ids.map((pid: string) => ({
      meeting_id: meeting.id,
      profile_id: pid,
      role: "participant",
    }));

    const { error: partError } = await admin
      .from("meeting_participants")
      .insert(participantRows);

    if (partError) {
      console.error("Failed to insert participants:", partError.message);
    }

    return NextResponse.json({ meeting }, { status: 201 });
  } catch (error) {
    console.error("Meetings POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
