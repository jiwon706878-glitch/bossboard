import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey, logApiCall } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod/v4";

const WriteContextSchema = z.object({
  content: z.string().min(1).max(2000),
});

// POST /api/v1/context/write — Agent writes a note
export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateApiKey(req);
    if (auth instanceof NextResponse) return auth;

    const body = await req.json();
    const parsed = WriteContextSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    const { content } = parsed.data;

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

    logApiCall(auth.businessId, auth.apiKeyId, "/api/v1/context/write", "POST", 201, auth.keyName);
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("V1 context write error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
