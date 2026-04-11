import { unstable_cache, revalidateTag } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Launch discount: first 100 paid users get 30% off forever.
 *
 * State lives in the `launch_discount_state` table (single row).
 * Reads go through `unstable_cache` with the `launch-discount` tag;
 * writes from the Paddle webhook call `revalidateTag` so the landing
 * page, banner, and pricing cards all pick up the new count on the
 * next request — no polling, no time-based revalidation.
 */

export const LAUNCH_DISCOUNT_LIMIT = 100;
export const LAUNCH_DISCOUNT_PERCENT = 30;
export const LAUNCH_DISCOUNT_CODE =
  process.env.PADDLE_LAUNCH_DISCOUNT_CODE || "LAUNCH100";

export interface LaunchDiscountState {
  count: number;
  remaining: number;
  expired: boolean;
  active: boolean;
  expiredAt: string | null;
}

export const getLaunchDiscountState = unstable_cache(
  async (): Promise<LaunchDiscountState> => {
    try {
      const supabase = createAdminClient();
      const { data } = await supabase
        .from("launch_discount_state")
        .select("paid_users_count, discount_expired, expired_at")
        .order("updated_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      const count = data?.paid_users_count ?? 0;
      const expired = data?.discount_expired ?? false;
      return {
        count,
        remaining: Math.max(0, LAUNCH_DISCOUNT_LIMIT - count),
        expired,
        active: !expired && count < LAUNCH_DISCOUNT_LIMIT,
        expiredAt: data?.expired_at ?? null,
      };
    } catch {
      // If the table doesn't exist yet (pre-migration), treat as active
      // so we don't break the landing page. Log server-side for visibility.
      return {
        count: 0,
        remaining: LAUNCH_DISCOUNT_LIMIT,
        expired: false,
        active: true,
        expiredAt: null,
      };
    }
  },
  ["launch-discount-state"],
  { tags: ["launch-discount"] }
);

/**
 * Called from the Paddle webhook on the first subscription for a user.
 * Uses a SQL function for atomic increment — concurrent calls cannot
 * double-count or race past the 100-user boundary.
 *
 * Returns the new count and whether the discount just expired.
 */
export async function incrementPaidUserCount(): Promise<{
  count: number;
  expired: boolean;
}> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("increment_launch_discount_count");

  if (error || !data || !Array.isArray(data) || data.length === 0) {
    console.error("[launch-discount] increment failed", error);
    return { count: 0, expired: false };
  }

  const row = data[0] as { count: number; expired: boolean };

  // Invalidate the tagged cache so the banner, landing page, and
  // pricing cards all regenerate on the next request. The { expire: 0 }
  // profile marks the entry stale immediately (Next 16 requires the
  // second argument — without it, invalidation would be deferred).
  revalidateTag("launch-discount", { expire: 0 });

  return { count: row.count, expired: row.expired };
}
