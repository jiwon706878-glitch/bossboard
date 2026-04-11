import { NextResponse } from "next/server";
import { getActivePromotion } from "@/lib/promotions";

/**
 * Trusted server-side check of the active promotion. The dashboard
 * billing page calls this before opening Paddle checkout so clients
 * cannot self-apply an expired coupon — the paddle discount id is
 * only returned while the server still considers the promo active.
 */
export async function GET() {
  const promotion = await getActivePromotion();

  if (!promotion) {
    return NextResponse.json({
      active: false,
      promotion: null,
      discountCode: null,
    });
  }

  return NextResponse.json({
    active: true,
    promotion: {
      id: promotion.id,
      name: promotion.name,
      discountType: promotion.discount_type,
      discountValue: promotion.discount_value,
      appliesTo: promotion.applies_to,
      maxUses: promotion.max_uses,
      currentUses: promotion.current_uses,
      remaining:
        promotion.max_uses === null
          ? null
          : Math.max(0, promotion.max_uses - promotion.current_uses),
    },
    discountCode: promotion.paddle_discount_id,
  });
}
