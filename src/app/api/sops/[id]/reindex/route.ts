import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { scheduleIndexing } from "@/lib/ai/index-queue";
import { getUserPlan } from "@/lib/agents";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/sops/[id]/reindex
 *
 * Called by the dashboard edit page (and other save paths) after a
 * successful SOP update. Verifies ownership, enforces the Starter+
 * plan gate, and queues the Gemini indexer through the 5-minute
 * debounce. Returns quickly — the actual indexing runs asynchronously
 * in the background so the save flow isn't blocked.
 *
 * Free plan returns 200 with { skipped: 'free_plan' } rather than
 * an error — the client doesn't need to treat this as a failure.
 */
export async function POST(_req: Request, { params }: RouteParams) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: sopId } = await params;

  // Plan gate — free plan doesn't get auto-indexing
  const plan = await getUserPlan(user.id);
  if (plan === "free") {
    return NextResponse.json({ skipped: "free_plan", plan });
  }

  // Ownership check: the SOP must belong to a business the user owns.
  // Use the admin client for the check so we read past RLS — we're
  // already authenticated above.
  const admin = createAdminClient();
  const { data: sop, error } = await admin
    .from("sops")
    .select("id, title, content, business_id, deleted_at")
    .eq("id", sopId)
    .maybeSingle();

  if (error || !sop || sop.deleted_at) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { data: business } = await admin
    .from("businesses")
    .select("id")
    .eq("id", sop.business_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!business) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  scheduleIndexing(sopId, sop.content, sop.title);

  return NextResponse.json({ queued: true, plan });
}
