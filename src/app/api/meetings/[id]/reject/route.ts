import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/meetings/[id]/reject — Reject a completed meeting
 */
export async function POST(
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

    const { data: meeting } = await admin
      .from("meetings")
      .select("id, created_by, status")
      .eq("id", id)
      .single();

    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    if (meeting.created_by !== user.id) {
      return NextResponse.json({ error: "Only the meeting creator can reject" }, { status: 403 });
    }

    if (meeting.status !== "completed") {
      return NextResponse.json({ error: "Only completed meetings can be rejected" }, { status: 400 });
    }

    const { error } = await admin
      .from("meetings")
      .update({
        status: "rejected",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Meeting reject error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
