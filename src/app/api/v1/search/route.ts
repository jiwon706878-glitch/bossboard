import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey, logApiCall } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/v1/search?q=query — Search across SOPs, board posts, and todos
export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateApiKey(req);
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);

    if (!query || query.trim().length === 0) {
      return NextResponse.json({ error: "Missing search query parameter: ?q=" }, { status: 400 });
    }

    const searchTerm = `%${query.trim()}%`;
    const admin = createAdminClient();

    // Get the business owner's user_id for todo scoping
    const { data: business } = await admin
      .from("businesses")
      .select("user_id")
      .eq("id", auth.businessId)
      .single();

    const [sopsResult, boardResult, todosResult] = await Promise.all([
      // Search SOPs by title and summary
      admin
        .from("sops")
        .select("id, title, summary, doc_type, status, updated_at")
        .eq("business_id", auth.businessId)
        .is("deleted_at", null)
        .or(`title.ilike.${searchTerm},summary.ilike.${searchTerm}`)
        .order("updated_at", { ascending: false })
        .limit(limit),

      // Search board posts by title and content
      admin
        .from("board_posts")
        .select("id, title, content, created_at")
        .eq("business_id", auth.businessId)
        .or(`title.ilike.${searchTerm},content.ilike.${searchTerm}`)
        .order("created_at", { ascending: false })
        .limit(limit),

      // Search todos by text (scoped to business owner)
      business
        ? admin
            .from("todos")
            .select("id, text, completed, due_date, created_at")
            .eq("user_id", business.user_id)
            .ilike("text", searchTerm)
            .order("created_at", { ascending: false })
            .limit(limit)
        : Promise.resolve({ data: [], error: null }),
    ]);

    const results = {
      sops: sopsResult.data ?? [],
      posts: boardResult.data ?? [],
      todos: todosResult.data ?? [],
    };

    logApiCall(auth.businessId, auth.apiKeyId, "/api/v1/search", "GET", 200, auth.keyName);
    return NextResponse.json(results);
  } catch (error) {
    console.error("V1 Search GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
