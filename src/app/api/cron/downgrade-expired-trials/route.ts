import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Vercel Cron: runs daily at 00:00 UTC.
 * Finds profiles whose Pro trial has expired and who have NOT
 * added a paid subscription (paddle_customer_id is null).
 * Downgrades them to their original_plan_id (typically 'free').
 */
export async function GET(request: Request) {
  // Verify cron secret to prevent unauthorized calls
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const { data: expired, error } = await supabase
    .from("profiles")
    .select("id, trial_plan, original_plan_id")
    .lt("trial_end_date", new Date().toISOString())
    .is("paddle_customer_id", null)
    .not("trial_end_date", "is", null);

  if (error) {
    console.error("[cron/downgrade] Query error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!expired || expired.length === 0) {
    return NextResponse.json({ downgraded: 0 });
  }

  let downgraded = 0;

  for (const user of expired) {
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        plan_id: user.original_plan_id || "free",
        trial_end_date: null,
        trial_plan: null,
        original_plan_id: null,
      })
      .eq("id", user.id);

    if (updateError) {
      console.error(`[cron/downgrade] Failed for ${user.id}:`, updateError.message);
    } else {
      downgraded++;
    }
  }

  console.log(`[cron/downgrade] Downgraded ${downgraded}/${expired.length} expired trials`);

  return NextResponse.json({ downgraded, total: expired.length });
}
