"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { PlanId } from "@/config/plans";

/**
 * Reads the current user's plan from `public.users.plan`. Defaults to
 * `"free"` when:
 *   - the user isn't signed in
 *   - the `plan` column is null
 *   - the read fails (offline, RLS misconfigured, etc.)
 *
 * Conservative on purpose: gating UI behind plan checks should fail
 * closed (assume free) when we can't confirm a paid plan.
 */
export function usePlan(): { plan: PlanId; loading: boolean } {
  const [plan, setPlan] = useState<PlanId>("free");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!session) {
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("users")
        .select("plan")
        .eq("id", session.user.id)
        .maybeSingle();
      if (cancelled) return;
      const value = (data?.plan as PlanId | undefined) ?? "free";
      setPlan(value);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { plan, loading };
}
