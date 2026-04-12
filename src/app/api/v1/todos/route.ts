import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey, logApiCall } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod/v4";

const CreateTodoSchema = z.object({
  text: z.string().min(1).max(1000),
  due_date: z.string().optional(),
  priority: z.number().min(0).max(3).optional(),
});

// GET /api/v1/todos — List todos
export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateApiKey(req);
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(req.url);
    const completed = searchParams.get("completed");
    const limitRaw = searchParams.get("limit");
    const limitParsed = limitRaw ? Number.parseInt(limitRaw, 10) : 50;
    const limit = Math.min(Number.isFinite(limitParsed) && limitParsed > 0 ? limitParsed : 50, 100);

    const admin = createAdminClient();

    // Get the business owner's user_id to scope todos
    const { data: business } = await admin
      .from("businesses")
      .select("user_id")
      .eq("id", auth.businessId)
      .single();

    if (!business) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    let query = admin
      .from("todos")
      .select("id, text, completed, completed_at, due_date, priority, sort_order, created_at")
      .eq("user_id", business.user_id);

    if (completed === "true") {
      query = query.eq("completed", true);
    } else if (completed === "false") {
      query = query.eq("completed", false);
    }

    const { data, error } = await query
      .order("sort_order")
      .limit(limit);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    logApiCall(auth.businessId, auth.apiKeyId, "/api/v1/todos", "GET", 200, auth.keyName);
    return NextResponse.json({ todos: data ?? [] });
  } catch (error) {
    console.error("V1 Todos GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/v1/todos — Create a todo
export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateApiKey(req);
    if (auth instanceof NextResponse) return auth;

    const { checkAgentPermission } = await import("@/lib/api/agent-permissions");
    const denied = await checkAgentPermission(auth.apiKeyId, "can_create_todos");
    if (denied) return denied;

    const body = await req.json();
    const parsed = CreateTodoSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    const { text, due_date, priority } = parsed.data;

    const admin = createAdminClient();

    // Get the business owner's user_id
    const { data: business } = await admin
      .from("businesses")
      .select("user_id")
      .eq("id", auth.businessId)
      .single();

    if (!business) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    const { data, error } = await admin
      .from("todos")
      .insert({
        user_id: business.user_id,
        text: text.trim(),
        due_date: due_date || null,
        priority: priority ?? 0,
        completed: false,
      })
      .select("id, text, due_date, priority, created_at")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    logApiCall(auth.businessId, auth.apiKeyId, "/api/v1/todos", "POST", 201, auth.keyName);
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("V1 Todos POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
