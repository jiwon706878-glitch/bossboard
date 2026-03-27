import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey, logApiCall } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/v1/agent-log — Activity log
export async function GET(req: NextRequest) {
  const auth = await authenticateApiKey(req);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("agent_activity_log")
    .select("id, endpoint, method, status_code, created_at")
    .eq("business_id", auth.businessId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  logApiCall(auth.businessId, auth.apiKeyId, "/api/v1/agent-log", "GET", 200);
  return NextResponse.json({ logs: data ?? [] });
}
