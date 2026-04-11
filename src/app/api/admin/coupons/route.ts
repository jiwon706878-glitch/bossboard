import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin-auth";
import { generateCouponCode } from "@/lib/coupons";

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
    .from("coupons")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ coupons: data ?? [] });
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

  // Day 5 dropped credit-type coupons; only 'discount' is accepted.
  const couponType = body.coupon_type;
  if (couponType !== "discount") {
    return NextResponse.json({ error: "invalid_coupon_type" }, { status: 400 });
  }

  const suppliedCode =
    typeof body.code === "string" && body.code.trim()
      ? body.code.trim().toUpperCase()
      : null;

  const maxUses = Number(body.max_uses ?? 1);
  if (!Number.isFinite(maxUses) || maxUses < 1) {
    return NextResponse.json({ error: "invalid_max_uses" }, { status: 400 });
  }

  const expiresAt =
    typeof body.expires_at === "string" && body.expires_at
      ? body.expires_at
      : null;

  const discountType = body.discount_type;
  const discountValue = Number(body.discount_value);
  if (discountType !== "percent" && discountType !== "fixed") {
    return NextResponse.json(
      { error: "invalid_discount_type" },
      { status: 400 }
    );
  }
  if (!Number.isFinite(discountValue) || discountValue < 0) {
    return NextResponse.json(
      { error: "invalid_discount_value" },
      { status: 400 }
    );
  }

  const base: Record<string, unknown> = {
    coupon_type: "discount",
    max_uses: maxUses,
    expires_at: expiresAt,
    created_by: auth.userId,
    discount_type: discountType,
    discount_value: discountValue,
    applies_to: Array.isArray(body.applies_to)
      ? (body.applies_to as unknown[]).filter(
          (p): p is string =>
            typeof p === "string" && ["starter", "pro", "business"].includes(p)
        )
      : ["starter", "pro", "business"],
    paddle_discount_id:
      typeof body.paddle_discount_id === "string" && body.paddle_discount_id
        ? body.paddle_discount_id
        : null,
  };

  const supabase = createAdminClient();

  // Try insert with retry on collision
  for (let attempt = 0; attempt < 3; attempt++) {
    const code = suppliedCode ?? generateCouponCode();
    const { data, error } = await supabase
      .from("coupons")
      .insert({ ...base, code })
      .select()
      .single();

    if (!error) {
      return NextResponse.json({ coupon: data });
    }

    // 23505 = unique_violation
    const isCollision =
      (error as { code?: string }).code === "23505" && !suppliedCode;
    if (!isCollision) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    // collision — retry with a fresh generated code
  }

  return NextResponse.json(
    { error: "could_not_generate_unique_code" },
    { status: 500 }
  );
}
