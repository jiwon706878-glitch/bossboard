import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey, logApiCall } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabase/admin";

// POST /api/v1/context/write — Agent writes a note
export async function POST(req: NextRequest) {
  const auth = await authenticateApiKey(req);
  if (auth instanceof NextResponse) return auth;

  const { content } = await req.json();
  if (!content || typeof content !== "string") {
    return NextResponse.json({ error: "content required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("agent_notes")
    .insert({
      business_id: auth.businessId,
      api_key_id: auth.apiKeyId,
      content: content.trim().substring(0, 2000),
    })
    .select("id, content, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  logApiCall(auth.businessId, auth.apiKeyId, "/api/v1/context/write", "POST", 201);
  return NextResponse.json(data, { status: 201 });
}
