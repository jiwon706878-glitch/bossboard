import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { plans, type PlanId } from "@/config/plans";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

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
    const { email, role, businessId, linkOnly } = body;

    if (!role || !businessId) {
      return NextResponse.json(
        { error: "Role and businessId are required" },
        { status: 400 }
      );
    }

    if (!linkOnly && !email) {
      return NextResponse.json(
        { error: "Email is required for email invites" },
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
      .select("id, user_id, name")
      .eq("id", businessId)
      .single();

    if (bizError || !business) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    if (business.user_id !== user.id) {
      return NextResponse.json(
        { error: "You do not have permission to invite members" },
        { status: 403 }
      );
    }

    // Check plan limits
    const { data: profile } = await supabase
      .from("profiles")
      .select("plan_id")
      .eq("id", user.id)
      .single();

    const planId = (profile?.plan_id || "free") as PlanId;
    const plan = plans[planId];
    const maxMembers = plan?.limits?.teamMembers ?? 1;

    const { count: pendingCount } = await supabase
      .from("invites")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", businessId)
      .eq("accepted", false);

    // Owner counts as 1
    const totalUsed = 1 + (pendingCount || 0);

    if (maxMembers !== -1 && totalUsed >= maxMembers) {
      return NextResponse.json(
        { error: `Team limit reached for your ${plan.name} plan. Upgrade to add more.` },
        { status: 403 }
      );
    }

    // Check for duplicate email invite
    if (email) {
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
    }

    // Create invite
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: invite, error: insertError } = await supabase
      .from("invites")
      .insert({
        workspace_id: businessId,
        business_id: businessId,
        email: email || null,
        role,
        token,
        accepted: false,
        status: "pending",
        created_by: user.id,
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    const inviteUrl = `${APP_URL}/invite/${token}`;

    // Send email if this is an email invite
    if (email && process.env.RESEND_API_KEY) {
      try {
        await resend.emails.send({
          from: "BossBoard <noreply@mybossboard.com>",
          to: email,
          subject: `You're invited to join ${business.name} on BossBoard`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
              <h2 style="color: #1A1D2B; margin-bottom: 8px;">You're invited!</h2>
              <p style="color: #5E6478; font-size: 15px; line-height: 1.6;">
                You've been invited to join <strong>${business.name}</strong> as a <strong>${role}</strong> on BossBoard.
              </p>
              <a href="${inviteUrl}" style="display: inline-block; background: #3366FF; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500; margin: 24px 0;">
                Accept Invite
              </a>
              <p style="color: #8B95B0; font-size: 13px; margin-top: 24px;">
                This invite expires in 7 days. If you didn't expect this, you can ignore it.
              </p>
            </div>
          `,
        });
      } catch (emailError) {
        console.error("Failed to send invite email:", emailError);
        // Don't fail the invite creation if email fails
      }
    }

    return NextResponse.json({ invite, inviteUrl }, { status: 201 });
  } catch (error) {
    console.error("Team invite error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
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
      return NextResponse.json({ error: "Invite ID is required" }, { status: 400 });
    }

    const { data: invite } = await supabase
      .from("invites")
      .select("id, workspace_id")
      .eq("id", inviteId)
      .single();

    if (!invite) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 });
    }

    const { data: business } = await supabase
      .from("businesses")
      .select("user_id")
      .eq("id", invite.workspace_id)
      .single();

    if (!business || business.user_id !== user.id) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const { error: deleteError } = await supabase
      .from("invites")
      .delete()
      .eq("id", inviteId);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete invite error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
