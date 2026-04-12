import { unstable_cache, revalidateTag } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * BB v2.0 beta state. The beta window has a start and end date;
 * the beta banner shows "Pro free for 14 days, N days left" based
 * on end_date. Auto-enrollment of signups into trials and the
 * downgrade cron are Day 4+ work — this module only exposes the
 * dates + a stub for isInBetaTrial so feature gates can start
 * reading it now without breaking anything.
 */

const BETA_TAG = "beta-state";

export interface BetaState {
  isActive: boolean;
  startDate: string;
  endDate: string;
  proTrialDays: number;
  daysRemaining: number;
}

export const getBetaState = unstable_cache(
  async (): Promise<BetaState | null> => {
    try {
      const supabase = createAdminClient();
      const { data } = await supabase
        .from("beta_state")
        .select("is_active, start_date, end_date, pro_trial_days")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!data) return null;

      const end = new Date(data.end_date).getTime();
      const now = Date.now();
      const daysRemaining = Math.max(
        0,
        Math.ceil((end - now) / (24 * 60 * 60 * 1000))
      );

      return {
        isActive: data.is_active && end > now,
        startDate: data.start_date,
        endDate: data.end_date,
        proTrialDays: data.pro_trial_days,
        daysRemaining,
      };
    } catch {
      return null;
    }
  },
  ["beta-state"],
  { tags: [BETA_TAG] }
);

/**
 * Whether the given user is currently inside their Pro trial.
 * Reads profiles.trial_end_date — returns true if the date is in the future.
 */
export async function isInBetaTrial(userId: string): Promise<boolean> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("profiles")
      .select("trial_end_date")
      .eq("id", userId)
      .single();

    if (!data?.trial_end_date) return false;
    return new Date(data.trial_end_date).getTime() > Date.now();
  } catch {
    return false;
  }
}

/** Invalidates the cached beta state — called from admin mutations. */
export function invalidateBetaCache(): void {
  revalidateTag(BETA_TAG, { expire: 0 });
}
