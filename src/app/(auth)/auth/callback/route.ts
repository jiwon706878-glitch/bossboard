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
