import { getRemainingDiscountSlots } from "@/lib/promotions";
import { getBetaState } from "@/lib/beta";
import { LaunchBannerClient } from "./launch-banner-client";

/**
 * BB v2.0 beta banner — server component.
 *
 * Reads the remaining Starter + Pro 100-user discount slots (from the
 * promotions table) and the beta window (from beta_state), then hands
 * counts to the dismissible client banner. The 14-day Pro trial claim
 * was removed from the banner copy for Day 3 because `isInBetaTrial`
 * is still a stub — Day 4 will wire up auto-enrollment and restore
 * the trial headline. For now the banner only advertises what's
 * actually backed by real counters.
 *
 * File kept as launch-banner.tsx so the marketing layout import
 * doesn't need to change.
 */
export async function LaunchBanner() {
  const [slots, beta] = await Promise.all([
    getRemainingDiscountSlots(),
    getBetaState(),
  ]);

  const anySlots = (slots.starter ?? 0) > 0 || (slots.pro ?? 0) > 0;
  if (!beta?.isActive && !anySlots) return null;

  return (
    <LaunchBannerClient
      starterLeft={slots.starter}
      proLeft={slots.pro}
    />
  );
}
