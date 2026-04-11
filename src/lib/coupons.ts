import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Coupons = individual redeemable codes managed from /admin/promotions
 * (Coupons tab). BB v2.0 Day 5 removed the credit system entirely,
 * so coupons now only support the 'discount' shape (applied at Paddle
 * checkout via paddle_discount_id). The orphaned `credit_amount`
 * column on the coupons table is kept for archival reasons but no
 * new coupon uses it — a DB-side CHECK constraint enforces discount-only.
 *
 * Redemption is atomic via the SQL function redeem_coupon_atomic.
 */

export interface CouponRow {
  id: string;
  code: string;
  coupon_type: "discount";
  discount_type: "percent" | "fixed" | null;
  discount_value: number | null;
  applies_to: string[] | null;
  paddle_discount_id: string | null;
  max_uses: number;
  current_uses: number;
  expires_at: string | null;
  created_by: string | null;
  created_at: string;
}

// Unambiguous alphabet: no 0/O, no 1/I/L
const CODE_CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Generates a `BB-XXXXXXXX` style coupon code. */
export function generateCouponCode(): string {
  let body = "";
  for (let i = 0; i < 8; i++) {
    body += CODE_CHARSET[Math.floor(Math.random() * CODE_CHARSET.length)];
  }
  return `BB-${body}`;
}

export type RedeemError =
  | "not_found"
  | "expired"
  | "exhausted"
  | "already_redeemed"
  | "no_business"
  | "server_error";

export type RedeemResult =
  | {
      success: true;
      couponId: string;
      type: "discount";
      discountType: "percent" | "fixed" | null;
      discountValue: number | null;
      paddleDiscountId: string | null;
      appliesTo: string[] | null;
    }
  | { success: false; error: RedeemError };

/**
 * Atomic redemption. Caller (route handler) must have verified the
 * caller's session and looked up their business_id before invoking.
 */
export async function redeemCouponAtomic(
  code: string,
  userId: string,
  businessId: string
): Promise<RedeemResult> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("redeem_coupon_atomic", {
    p_code: code,
    p_user_id: userId,
    p_business_id: businessId,
  });

  if (error || !data || !Array.isArray(data) || data.length === 0) {
    console.error("[coupons] redeem_coupon_atomic failed", error);
    return { success: false, error: "server_error" };
  }

  const row = data[0] as {
    success: boolean;
    error_code: string | null;
    coupon_id: string | null;
    coupon_type: "discount" | null;
    discount_type: "percent" | "fixed" | null;
    discount_value: number | null;
    paddle_discount_id: string | null;
    applies_to: string[] | null;
  };

  if (!row.success) {
    return {
      success: false,
      error: (row.error_code ?? "server_error") as RedeemError,
    };
  }

  return {
    success: true,
    couponId: row.coupon_id!,
    type: "discount",
    discountType: row.discount_type,
    discountValue: row.discount_value,
    paddleDiscountId: row.paddle_discount_id,
    appliesTo: row.applies_to,
  };
}
