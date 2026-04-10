import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey, logApiCall } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabase/admin";

// PATCH /api/v1/todos/:id — Update/complete a todo
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateApiKey(req);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const body = await req.json();
    const admin = createAdminClient();

    // Get the business owner's user_id for scoping
    const { data: business } = await admin
      .from("businesses")
      .select("user_id")
      .eq("id", auth.businessId)
      .single();

    if (!business) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    // Verify todo belongs to this business's owner
    const { data: existing } = await admin
      .from("todos")
      .select("id")
      .eq("id", id)
      .eq("user_id", business.user_id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Todo not found" }, { status: 404 });
    }

    const updates: Record<string, unknown> = {};
    if (body.text !== undefined) updates.text = body.text.trim();
    if (body.completed !== undefined) {
      updates.completed = body.completed;
      updates.completed_at = body.completed ? new Date().toISOString() : null;
    }
    if (body.due_date !== undefined) updates.due_date = body.due_date || null;
    if (body.priority !== undefined) updates.priority = body.priority;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const { data, error } = await admin
      .from("todos")
      .update(updates)
      .eq("id", id)
      .select("id, text, completed, completed_at, due_date, priority")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    logApiCall(auth.businessId, auth.apiKeyId, `/api/v1/todos/${id}`, "PATCH", 200, auth.keyName);
    return NextResponse.json(data);
  } catch (error) {
    console.error("V1 Todo PATCH error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/v1/todos/:id — Delete a todo
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateApiKey(req);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const admin = createAdminClient();

    // Get the business owner's user_id for scoping
    const { data: business } = await admin
      .from("businesses")
      .select("user_id")
      .eq("id", auth.businessId)
      .single();

    if (!business) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    // Verify todo belongs to this business's owner
    const { data: existing } = await admin
      .from("todos")
      .select("id")
      .eq("id", id)
      .eq("user_id", business.user_id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Todo not found" }, { status: 404 });
    }

    const { error } = await admin
      .from("todos")
      .delete()
      .eq("id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    logApiCall(auth.businessId, auth.apiKeyId, `/api/v1/todos/${id}`, "DELETE", 200, auth.keyName);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("V1 Todo DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
