import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey, logApiCall } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/v1/context — Business context for the agent
export async function GET(req: NextRequest) {
  const auth = await authenticateApiKey(req);
  if (auth instanceof NextResponse) return auth;

  const admin = createAdminClient();

  const [{ data: business }, { count: sopCount }, { data: recentSops }, { data: notes }] =
    await Promise.all([
      admin
        .from("businesses")
        .select("name, type, address, menu_or_services, brand_tone, target_customers")
        .eq("id", auth.businessId)
        .single(),
      admin
        .from("sops")
        .select("id", { count: "exact", head: true })
        .eq("business_id", auth.businessId)
        .is("deleted_at", null),
      admin
        .from("sops")
        .select("id, title, doc_type, updated_at")
        .eq("business_id", auth.businessId)
        .is("deleted_at", null)
        .order("updated_at", { ascending: false })
        .limit(5),
      admin
        .from("agent_notes")
        .select("content, created_at")
        .eq("business_id", auth.businessId)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

  logApiCall(auth.businessId, auth.apiKeyId, "/api/v1/context", "GET", 200);

  return NextResponse.json({
    business: business ?? {},
    sopCount: sopCount ?? 0,
    recentDocuments: recentSops ?? [],
    agentNotes: notes ?? [],
  });
}
