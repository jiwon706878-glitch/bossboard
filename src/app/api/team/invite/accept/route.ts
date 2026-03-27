import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { token } = await req.json();

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    // Find the invite
    const { data: invite, error: inviteError } = await supabase
      .from("invites")
      .select("id, workspace_id, business_id, email, role, accepted, status, expires_at")
      .eq("token", token)
      .single();

    if (inviteError || !invite) {
      return NextResponse.json({ error: "Invalid invite link" }, { status: 404 });
    }

    if (invite.accepted || invite.status === "accepted") {
      return NextResponse.json({ error: "This invite has already been used" }, { status: 400 });
    }

    if (invite.status === "expired" || (invite.expires_at && new Date(invite.expires_at) < new Date())) {
      // Mark as expired
      await supabase.from("invites").update({ status: "expired" }).eq("id", invite.id);
      return NextResponse.json({ error: "This invite has expired" }, { status: 400 });
    }

    // If invite was for a specific email, verify it matches
    if (invite.email && invite.email.toLowerCase() !== user.email?.toLowerCase()) {
      return NextResponse.json(
        { error: "This invite was sent to a different email address" },
        { status: 403 }
      );
    }

    const businessId = invite.business_id || invite.workspace_id;

    // Check if user is already a member of this business
    const { data: existingBusiness } = await supabase
      .from("businesses")
      .select("id")
      .eq("id", businessId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingBusiness) {
      // Mark invite as accepted anyway
      await supabase.from("invites").update({ accepted: true, status: "accepted" }).eq("id", invite.id);
      return NextResponse.json({ businessId, alreadyMember: true });
    }

    // Update the user's profile to link them to this business
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        role: invite.role || "member",
      })
      .eq("id", user.id);

    if (profileError) {
      console.error("Profile update error:", profileError);
    }

    // Mark invite as accepted
    const { error: updateError } = await supabase
      .from("invites")
      .update({ accepted: true, status: "accepted" })
      .eq("id", invite.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ businessId, role: invite.role });
  } catch (error) {
    console.error("Accept invite error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
