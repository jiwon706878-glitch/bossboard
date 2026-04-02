import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

    // Find the invite (use admin client — accepting user may not have RLS access to invites)
    const admin = createAdminClient();
    const { data: invite, error: inviteError } = await admin
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
      await admin.from("invites").update({ status: "expired" }).eq("id", invite.id);
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

    // Check if user is already the owner of this business
    const { data: existingBusiness } = await admin
      .from("businesses")
      .select("id")
      .eq("id", businessId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingBusiness) {
      // Mark invite as accepted anyway
      await admin.from("invites").update({ accepted: true, status: "accepted" }).eq("id", invite.id);
      return NextResponse.json({ businessId, alreadyMember: true });
    }

    // Add user as a member of the business
    const { error: memberError } = await admin
      .from("business_members")
      .upsert({
        business_id: businessId,
        user_id: user.id,
        role: invite.role || "member",
        email: user.email || invite.email || null,
      }, { onConflict: "business_id,user_id" });

    if (memberError) {
      console.error("Failed to add member:", memberError);
    }

    // Update the user's profile role
    const { error: profileError } = await admin
      .from("profiles")
      .update({
        role: invite.role || "member",
      })
      .eq("id", user.id);

    if (profileError) {
      console.error("Profile update error:", profileError);
    }

    // Mark invite as accepted
    const { error: updateError } = await admin
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
