import { getActivePromotion } from "@/lib/promotions";
import { LaunchBannerClient } from "./launch-banner-client";

/**
 * Server component. Fetches the active promotion (cached via
 * unstable_cache with the 'promotions' tag) and renders the
 * dismissible client banner only while a promo is active AND has
 * show_banner = true.
 *
 * When the admin toggles a promotion off (or the Paddle webhook
 * increments past max_uses), the cache is invalidated via
 * revalidateTag('promotions') and this component returns null on
 * the next request — the banner disappears automatically.
 */
export async function LaunchBanner() {
  const promotion = await getActivePromotion();
  if (!promotion || !promotion.show_banner) return null;

  // Banner text has sensible fallbacks so an admin can leave it
  // blank and still get a usable message.
  const baseText =
    promotion.banner_text?.trim() ||
    (promotion.discount_type === "percent"
      ? `${promotion.discount_value}% off all paid plans`
      : `$${promotion.discount_value} off all paid plans`);

  const remaining =
    promotion.max_uses !== null
      ? Math.max(0, promotion.max_uses - promotion.current_uses)
      : null;

  return <LaunchBannerClient text={baseText} remaining={remaining} />;
}
