import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin-auth";
import { invalidatePromotionsCache } from "@/lib/promotions";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.reason },
      { status: auth.reason === "unauthenticated" ? 401 : 403 }
    );
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("promotions")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ promotions: data ?? [] });
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.reason },
      { status: auth.reason === "unauthenticated" ? 401 : 403 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const discountType = body.discount_type;
  const discountValue = Number(body.discount_value);

  if (!name) {
    return NextResponse.json({ error: "name_required" }, { status: 400 });
  }
  if (discountType !== "percent" && discountType !== "fixed") {
    return NextResponse.json({ error: "invalid_discount_type" }, { status: 400 });
  }
  if (!Number.isFinite(discountValue) || discountValue < 0) {
    return NextResponse.json({ error: "invalid_discount_value" }, { status: 400 });
  }

  const appliesTo = Array.isArray(body.applies_to)
    ? (body.applies_to as unknown[]).filter(
        (p): p is string =>
          typeof p === "string" && ["starter", "pro", "business"].includes(p)
      )
    : ["starter", "pro", "business"];

  const payload = {
    name,
    description: typeof body.description === "string" ? body.description : null,
    discount_type: discountType,
    discount_value: discountValue,
    applies_to: appliesTo,
    is_active: body.is_active === true,
    max_uses:
      body.max_uses === null || body.max_uses === undefined || body.max_uses === ""
        ? null
        : Number(body.max_uses),
    starts_at: body.starts_at ? String(body.starts_at) : null,
    ends_at: body.ends_at ? String(body.ends_at) : null,
    paddle_discount_id:
      typeof body.paddle_discount_id === "string" && body.paddle_discount_id
        ? body.paddle_discount_id
        : null,
    show_banner: body.show_banner !== false,
    banner_text: typeof body.banner_text === "string" ? body.banner_text : null,
  };

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("promotions")
    .insert(payload)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  invalidatePromotionsCache();
  return NextResponse.json({ promotion: data });
}
