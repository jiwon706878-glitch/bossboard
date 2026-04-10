import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey, logApiCall } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod/v4";

const CreatePostSchema = z.object({
  title: z.string().min(1).max(500),
  content: z.string().min(1).max(10000),
});

// GET /api/v1/board — List board posts
export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateApiKey(req);
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(req.url);
    const limitRaw = searchParams.get("limit");
    const limitParsed = limitRaw ? Number.parseInt(limitRaw, 10) : 50;
    const limit = Math.min(Number.isFinite(limitParsed) && limitParsed > 0 ? limitParsed : 50, 100);

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("board_posts")
      .select("id, title, content, user_id, created_at")
      .eq("business_id", auth.businessId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    logApiCall(auth.businessId, auth.apiKeyId, "/api/v1/board", "GET", 200, auth.keyName);
    return NextResponse.json({ posts: data ?? [] });
  } catch (error) {
    console.error("V1 Board GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/v1/board — Create a board post
export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateApiKey(req);
    if (auth instanceof NextResponse) return auth;

    const body = await req.json();
    const parsed = CreatePostSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    const { title, content } = parsed.data;

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("board_posts")
      .insert({
        business_id: auth.businessId,
        title: title.trim(),
        content: content.trim(),
      })
      .select("id, title, content, created_at")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    logApiCall(auth.businessId, auth.apiKeyId, "/api/v1/board", "POST", 201, auth.keyName);
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("V1 Board POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
