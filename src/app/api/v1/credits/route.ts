import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey, logApiCall } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/v1/credits — Credit balance and recent usage
export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateApiKey(req);
    if (auth instanceof NextResponse) return auth;

    const admin = createAdminClient();

    // Get credit balance
    const { data: balance } = await admin
      .from("credit_balances")
      .select("credits_monthly, credits_monthly_used, credits_purchased, credits_purchased_used, updated_at")
      .eq("business_id", auth.businessId)
      .single();

    const monthly = balance?.credits_monthly ?? 0;
    const monthlyUsed = balance?.credits_monthly_used ?? 0;
    const purchased = balance?.credits_purchased ?? 0;
    const purchasedUsed = balance?.credits_purchased_used ?? 0;
    const monthlyAvailable = Math.max(0, monthly - monthlyUsed);
    const purchasedAvailable = Math.max(0, purchased - purchasedUsed);

    // Get recent usage (last 30 entries)
    const { data: recentUsage } = await admin
      .from("ai_usage")
      .select("feature, credits_used, created_at")
      .eq("business_id", auth.businessId)
      .order("created_at", { ascending: false })
      .limit(30);

    logApiCall(auth.businessId, auth.apiKeyId, "/api/v1/credits", "GET", 200, auth.keyName);

    return NextResponse.json({
      balance: {
        monthly,
        monthlyUsed,
        purchased,
        purchasedUsed,
        available: monthlyAvailable + purchasedAvailable,
      },
      recentUsage: recentUsage ?? [],
    });
  } catch (error) {
    console.error("V1 Credits GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
