import { getLaunchDiscountState } from "@/lib/launch-discount";
import { LaunchBannerClient } from "./launch-banner-client";

/**
 * Server component. Fetches the launch discount state (cached via
 * `unstable_cache` with the `launch-discount` tag) and renders the
 * dismissible client banner only while the promo is still active.
 *
 * When the Paddle webhook increments the counter past 100, it calls
 * `revalidateTag('launch-discount')` and this component returns null
 * on the next request — the banner disappears automatically.
 */
export async function LaunchBanner() {
  const state = await getLaunchDiscountState();
  if (!state.active) return null;
  return <LaunchBannerClient remaining={state.remaining} />;
}
