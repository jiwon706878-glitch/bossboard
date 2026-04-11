import { unstable_cache, revalidateTag } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Promotions = global, time/use-bounded discounts managed from
 * /admin/promotions. The active promotion drives the landing banner,
 * pricing-toggle strikethroughs, and the auto-applied Paddle coupon
 * at checkout.
 *
 * All reads are tagged with 'promotions' and revalidated on mutation,
 * so changes in the admin UI or a webhook-driven increment show up
 * on the landing page on the next request — no time-based polling.
 */

export type PlanSlug = "starter" | "pro" | "business";

export interface Promotion {
  id: string;
  name: string;
  description: string | null;
  discount_type: "percent" | "fixed";
  discount_value: number;
  applies_to: string[];
  is_active: boolean;
  max_uses: number | null;
  current_uses: number;
  starts_at: string | null;
  ends_at: string | null;
  paddle_discount_id: string | null;
  show_banner: boolean;
  banner_text: string | null;
  created_at: string;
}

const PROMOTIONS_TAG = "promotions";

/**
 * Returns the single "currently active" promotion, or null. Active means:
 *   - is_active = true
 *   - starts_at is null or in the past
 *   - ends_at is null or in the future
 *   - max_uses is null or current_uses < max_uses
 *
 * Wrapped in unstable_cache so the landing page (force-static) can
 * read this without hitting Supabase on every render. The 'promotions'
 * tag is invalidated by admin mutations + the Paddle webhook.
 */
export const getActivePromotion = unstable_cache(
  async (): Promise<Promotion | null> => {
    try {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from("promotions")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error || !data || data.length === 0) return null;

      const now = Date.now();
      const active = (data as Promotion[]).find((p) => {
        if (p.starts_at && new Date(p.starts_at).getTime() > now) return false;
        if (p.ends_at && new Date(p.ends_at).getTime() < now) return false;
        if (p.max_uses !== null && p.current_uses >= p.max_uses) return false;
        return true;
      });

      return active ?? null;
    } catch {
      return null;
    }
  },
  ["active-promotion"],
  { tags: [PROMOTIONS_TAG] }
);

/**
 * Atomic increment. Called from the Paddle webhook on a first-time
 * paid subscription (see api/paddle/webhook). The SQL function is
 * race-safe and also flips is_active → false when max_uses is hit.
 */
export async function incrementPromotionUses(
  promotionId: string
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.rpc("increment_promotion_uses", {
    promo_id: promotionId,
  });
  if (error) {
    console.error("[promotions] increment_promotion_uses failed", error);
    return;
  }
  invalidatePromotionsCache();
}

/**
 * Invalidate the cached active promotion. Callers: admin mutations
 * (create/update/delete) and the webhook increment.
 */
export function invalidatePromotionsCache(): void {
  // Next 16 requires the second arg — { expire: 0 } marks the tag
  // stale immediately so the landing page regenerates on the next
  // request. Passing a profile (e.g. 'max') would defer invalidation.
  revalidateTag(PROMOTIONS_TAG, { expire: 0 });
}

/**
 * Compute the discounted price for a plan under a given promotion.
 * Returns the original price if the plan isn't covered by the promo.
 */
export function applyPromotionToPrice(
  plan: PlanSlug,
  basePrice: number,
  promotion: Promotion | null
): number {
  if (!promotion || !promotion.applies_to.includes(plan) || basePrice <= 0) {
    return basePrice;
  }
  if (promotion.discount_type === "percent") {
    return Math.round(basePrice * (1 - promotion.discount_value / 100));
  }
  // fixed
  return Math.max(0, Math.round(basePrice - promotion.discount_value));
}
