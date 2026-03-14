import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { plans, type PlanId } from "@/config/plans";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { email, role, businessId } = body;

    if (!email || !role || !businessId) {
      return NextResponse.json(
        { error: "Email, role, and businessId are required" },
        { status: 400 }
      );
    }

    if (!["member", "admin"].includes(role)) {
      return NextResponse.json(
        { error: "Role must be member or admin" },
        { status: 400 }
      );
    }

    // Verify user owns this business
    const { data: business, error: bizError } = await supabase
      .from("businesses")
      .select("id, user_id, plan")
      .eq("id", businessId)
      .single();

    if (bizError || !business) {
      return NextResponse.json(
        { error: "Business not found" },
        { status: 404 }
      );
    }

    if (business.user_id !== user.id) {
      return NextResponse.json(
        { error: "You do not have permission to invite members to this business" },
        { status: 403 }
      );
    }

    // Check plan limits
    const planId = (business.plan || "free") as PlanId;
    const plan = plans[planId];
    const maxMembers = plan?.limits?.teamMembers ?? 1;

    // Count existing team members (profiles linked to this business)
    const { count: memberCount } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId);

    // Count pending invites
    const { count: pendingCount } = await supabase
      .from("invites")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", businessId)
      .eq("accepted", false);

    const totalUsed = (memberCount || 0) + (pendingCount || 0);

    if (totalUsed >= maxMembers) {
      return NextResponse.json(
        {
          error: `Your ${plan.name} plan allows ${maxMembers} team member${maxMembers !== 1 ? "s" : ""}. Upgrade to add more.`,
        },
        { status: 403 }
      );
    }

    // Check for duplicate invite
    const { data: existingInvite } = await supabase
      .from("invites")
      .select("id")
      .eq("workspace_id", businessId)
      .eq("email", email)
      .eq("accepted", false)
      .maybeSingle();

    if (existingInvite) {
      return NextResponse.json(
        { error: "An invite has already been sent to this email" },
        { status: 409 }
      );
    }

    // Create invite
    const token = crypto.randomUUID();

    const { data: invite, error: insertError } = await supabase
      .from("invites")
      .insert({
        workspace_id: businessId,
        email,
        role,
        token,
        accepted: false,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ invite }, { status: 201 });
  } catch (error) {
    console.error("Team invite error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const inviteId = searchParams.get("id");

    if (!inviteId) {
      return NextResponse.json(
        { error: "Invite ID is required" },
        { status: 400 }
      );
    }

    // Get the invite and verify ownership
    const { data: invite } = await supabase
      .from("invites")
      .select("id, workspace_id")
      .eq("id", inviteId)
      .single();

    if (!invite) {
      return NextResponse.json(
        { error: "Invite not found" },
        { status: 404 }
      );
    }

    // Verify user owns the business
    const { data: business } = await supabase
      .from("businesses")
      .select("user_id")
      .eq("id", invite.workspace_id)
      .single();

    if (!business || business.user_id !== user.id) {
      return NextResponse.json(
        { error: "Not authorized to revoke this invite" },
        { status: 403 }
      );
    }

    const { error: deleteError } = await supabase
      .from("invites")
      .delete()
      .eq("id", inviteId);

    if (deleteError) {
      return NextResponse.json(
        { error: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete invite error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
