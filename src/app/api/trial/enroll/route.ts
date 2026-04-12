import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getBetaState } from "@/lib/beta";

/**
 * POST /api/trial/enroll
 *
 * Called after auth callback to auto-enroll the user in a Pro trial
 * if the beta window is active. Idempotent: skips users who already
 * have a trial or a paid subscription.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const beta = await getBetaState();
  if (!beta?.isActive) {
    return NextResponse.json({ enrolled: false, reason: "beta_inactive" });
  }

  // Check current profile state
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("plan_id, trial_end_date, paddle_customer_id")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  // Skip if already on trial, already paid, or already on a non-free plan
  if (profile.trial_end_date) {
    return NextResponse.json({ enrolled: false, reason: "already_in_trial" });
  }
  if (profile.paddle_customer_id) {
    return NextResponse.json({ enrolled: false, reason: "paid_subscriber" });
  }
  if (profile.plan_id !== "free") {
    return NextResponse.json({ enrolled: false, reason: "non_free_plan" });
  }

  const trialEnd = new Date();
  trialEnd.setDate(trialEnd.getDate() + beta.proTrialDays);

  const { error: updateError } = await admin
    .from("profiles")
    .update({
      plan_id: "pro",
      trial_plan: "pro",
      trial_end_date: trialEnd.toISOString(),
      original_plan_id: "free",
    })
    .eq("id", user.id);

  if (updateError) {
    console.error("[trial/enroll] Update error:", updateError.message);
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ enrolled: true, trialEnd: trialEnd.toISOString() });
}
