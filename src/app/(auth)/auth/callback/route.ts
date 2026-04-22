import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getBetaState } from "@/lib/beta";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";
  const safeNext = (next.startsWith("/") && !next.startsWith("//")) ? next : "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error, data } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      // Auto-enroll in Pro trial during beta window
      await enrollTrialIfEligible(data.user.id);
      // Generate onboarding content for new users
      await generateOnboardingContent(data.user.id);
      return NextResponse.redirect(`${origin}${safeNext}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}

async function enrollTrialIfEligible(userId: string) {
  try {
    const beta = await getBetaState();
    if (!beta?.isActive) return;

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("plan_id, trial_end_date, paddle_customer_id")
      .eq("id", userId)
      .single();

    // Skip if already on trial, already paid, or not on free plan
    if (!profile) return;
    if (profile.trial_end_date) return;
    if (profile.paddle_customer_id) return;
    if (profile.plan_id !== "free") return;

    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + beta.proTrialDays);

    await admin
      .from("profiles")
      .update({
        plan_id: "pro",
        trial_plan: "pro",
        trial_end_date: trialEnd.toISOString(),
        original_plan_id: "free",
      })
      .eq("id", userId);
  } catch (e) {
    // Non-blocking — user still gets redirected to dashboard
    console.error("[auth/callback] Trial enrollment error:", e);
  }
}

async function generateOnboardingContent(userId: string) {
  try {
    const admin = createAdminClient();

    // Check if user already has content (returning user, not first login)
    const { data: existingSops } = await admin
      .from("sops")
      .select("id")
      .eq("created_by", userId)
      .limit(1);

    if (existingSops && existingSops.length > 0) return; // Not a new user

    // Find user's business
    const { data: membership } = await admin
      .from("business_members")
      .select("business_id")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();

    if (!membership) return; // No business yet (onboarding not complete)

    const businessId = membership.business_id;

    // Create "Getting Started" wiki page
    const gettingStartedContent = {
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Getting Started with BossBoard" }] },
        { type: "paragraph", content: [{ type: "text", text: "Welcome to your AI-powered workspace. This guide covers everything you need to get up and running." }] },
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Create Your First Agent" }] },
        { type: "paragraph", content: [{ type: "text", text: "Go to Settings → AI Agents → Create Agent. Give it a name, role, and preferred AI model. You'll get an API key (starts with bb_) that the agent uses to authenticate." }] },
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Connect Your API Key" }] },
        { type: "paragraph", content: [{ type: "text", text: "BossBoard is BYOK (Bring Your Own Key). Go to Settings → scroll to External API Keys → add your Anthropic, Google, OpenAI, or Grok key. Your provider bills you directly — BossBoard charges $0 for AI usage." }] },
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Write Agent Manuals" }] },
        { type: "paragraph", content: [{ type: "text", text: "Create wiki pages that serve as agent manuals. Assign a manual to each agent in Settings → Agents → Edit. The agent reads its manual on every task for context and instructions." }] },
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Use the Board" }] },
        { type: "paragraph", content: [{ type: "text", text: "Post updates, discussions, and polls in the Board. Channels include #general, #team, #agent-activity, and #announcements. Agents can post via the REST API." }] },
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Message Your Agents" }] },
        { type: "paragraph", content: [{ type: "text", text: "Click the message icon in the top bar or the Send button on any agent card to open a DM conversation. Agents respond via the API." }] },
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Learn More" }] },
        { type: "paragraph", content: [{ type: "text", text: "Visit mybossboard.com/docs for full documentation including REST API reference, MCP server setup, and advanced features." }] },
      ],
    };

    await admin.from("sops").insert({
      business_id: businessId,
      title: "Getting Started with BossBoard",
      content: gettingStartedContent,
      summary: "Welcome guide covering agents, BYOK, wiki, board, and DM.",
      category: "guide",
      status: "published",
      created_by: userId,
      version: 1,
    });

    // Create welcome board post
    await admin.from("board_posts").insert({
      business_id: businessId,
      user_id: userId,
      type: "notice",
      title: "Welcome to BossBoard",
      content: "Check your Library for the Getting Started guide. It covers creating agents, connecting your AI key, and using the board.",
      channel: "announcements",
      is_pinned: true,
    });
  } catch (e) {
    console.error("[auth/callback] Onboarding content error:", e);
  }
}
