import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redeemCouponAtomic } from "@/lib/coupons";

/**
 * POST /api/coupons/redeem
 * Body: { code: string }
 *
 * - 'credits' coupon: adds to the caller's credit_balances and returns
 *   { success: true, type: 'credits', creditAmount }.
 * - 'discount' coupon: validates + records the redemption and returns
 *   { success: true, type: 'discount', paddleDiscountId, ... }.
 *   The dashboard billing page stashes paddleDiscountId and passes it
 *   to Paddle.Checkout.open() on the next upgrade click.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  let body: { code?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const code =
    typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
  if (!code) {
    return NextResponse.json({ error: "code_required" }, { status: 400 });
  }

  // Find the caller's business — credit coupons need somewhere to
  // deposit the credits. For discount coupons we still want the
  // redemption recorded against a business for reporting.
  const admin = createAdminClient();
  const { data: business } = await admin
    .from("businesses")
    .select("id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!business) {
    return NextResponse.json({ error: "no_business" }, { status: 400 });
  }

  const result = await redeemCouponAtomic(code, user.id, business.id);

  if (!result.success) {
    const status =
      result.error === "not_found" || result.error === "expired"
        ? 404
        : result.error === "already_redeemed" || result.error === "exhausted"
          ? 409
          : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({
    success: true,
    type: result.type,
    discountType: result.discountType,
    discountValue: result.discountValue,
    creditAmount: result.creditAmount,
    paddleDiscountId: result.paddleDiscountId,
    appliesTo: result.appliesTo,
  });
}
