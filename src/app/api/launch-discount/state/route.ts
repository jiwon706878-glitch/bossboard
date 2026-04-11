import { NextResponse } from "next/server";
import {
  getLaunchDiscountState,
  LAUNCH_DISCOUNT_CODE,
  LAUNCH_DISCOUNT_PERCENT,
} from "@/lib/launch-discount";

/**
 * Trusted server-side check of the launch discount state.
 *
 * The dashboard billing page calls this before opening Paddle checkout
 * so the client can never self-apply a coupon after the promo expires:
 * the discount code is only returned while the server says `active`.
 */
export async function GET() {
  const state = await getLaunchDiscountState();

  return NextResponse.json({
    active: state.active,
    remaining: state.remaining,
    count: state.count,
    percent: LAUNCH_DISCOUNT_PERCENT,
    discountCode: state.active ? LAUNCH_DISCOUNT_CODE : null,
  });
}
