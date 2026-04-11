import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin-auth";
import { invalidatePromotionsCache } from "@/lib/promotions";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: Request, { params }: RouteParams) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.reason },
      { status: auth.reason === "unauthenticated" ? 401 : 403 }
    );
  }

  const { id } = await params;
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  // Only whitelisted fields are updatable. current_uses is writable
  // only through the atomic RPC, never through the admin UI.
  const update: Record<string, unknown> = {};
  if (typeof body.name === "string") update.name = body.name;
  if (typeof body.description === "string" || body.description === null)
    update.description = body.description;
  if (body.discount_type === "percent" || body.discount_type === "fixed")
    update.discount_type = body.discount_type;
  if (body.discount_value !== undefined)
    update.discount_value = Number(body.discount_value);
  if (Array.isArray(body.applies_to)) update.applies_to = body.applies_to;
  if (typeof body.is_active === "boolean") update.is_active = body.is_active;
  if (body.max_uses === null || typeof body.max_uses === "number")
    update.max_uses = body.max_uses;
  if (body.starts_at !== undefined) update.starts_at = body.starts_at || null;
  if (body.ends_at !== undefined) update.ends_at = body.ends_at || null;
  if (typeof body.paddle_discount_id === "string" || body.paddle_discount_id === null)
    update.paddle_discount_id = body.paddle_discount_id || null;
  if (typeof body.show_banner === "boolean") update.show_banner = body.show_banner;
  if (typeof body.banner_text === "string" || body.banner_text === null)
    update.banner_text = body.banner_text;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("promotions")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  invalidatePromotionsCache();
  return NextResponse.json({ promotion: data });
}

export async function DELETE(_req: Request, { params }: RouteParams) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.reason },
      { status: auth.reason === "unauthenticated" ? 401 : 403 }
    );
  }

  const { id } = await params;
  const supabase = createAdminClient();
  const { error } = await supabase.from("promotions").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  invalidatePromotionsCache();
  return NextResponse.json({ ok: true });
}
