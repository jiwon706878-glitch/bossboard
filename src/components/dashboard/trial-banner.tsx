"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Clock, Sparkles, ArrowRight, X } from "lucide-react";
import Link from "next/link";

interface TrialInfo {
  trialEndDate: string;
  trialPlan: string;
}

export function TrialBanner() {
  const [trial, setTrial] = useState<TrialInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [enrolling, setEnrolling] = useState(false);

  useEffect(() => {
    const dismissed = sessionStorage.getItem("bb_trial_banner_dismissed");
    if (dismissed) {
      setDismissed(true);
      return;
    }

    async function loadTrialState() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("trial_end_date, trial_plan, plan_id, paddle_customer_id")
        .eq("id", user.id)
        .single();

      if (!profile) return;

      // If user has no trial yet and no paid subscription, try auto-enrolling
      if (!profile.trial_end_date && !profile.paddle_customer_id && profile.plan_id === "free") {
        setEnrolling(true);
        try {
          const res = await fetch("/api/trial/enroll", { method: "POST" });
          const data = await res.json();
          if (data.enrolled) {
            setTrial({ trialEndDate: data.trialEnd, trialPlan: "pro" });
          }
        } catch {
          // Silent fail — user can still use free plan
        } finally {
          setEnrolling(false);
        }
        return;
      }

      if (profile.trial_end_date && profile.trial_plan) {
        setTrial({
          trialEndDate: profile.trial_end_date,
          trialPlan: profile.trial_plan,
        });
      }
    }

    loadTrialState();
  }, []);

  if (dismissed || enrolling) return null;
  if (!trial) return null;

  const now = new Date();
  const end = new Date(trial.trialEndDate);
  const daysLeft = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (86400 * 1000)));

  // Trial already expired — don't show banner (cron will downgrade)
  if (daysLeft === 0) return null;

  const isUrgent = daysLeft <= 3;

  return (
    <div
      className={`relative flex items-center gap-3 px-4 py-2.5 text-sm border-b ${
        isUrgent
          ? "bg-warning/8 border-warning/20 text-warning"
          : "bg-accent/5 border-accent/15 text-accent"
      }`}
    >
      {isUrgent ? (
        <Clock className="h-4 w-4 flex-shrink-0" />
      ) : (
        <Sparkles className="h-4 w-4 flex-shrink-0" />
      )}

      <span className="flex-1">
        <span className="font-medium capitalize">{trial.trialPlan} trial</span>
        {": "}
        <span className={isUrgent ? "font-semibold" : ""}>
          {daysLeft} {daysLeft === 1 ? "day" : "days"} left
        </span>
        {isUrgent && " — subscribe now to keep your features"}
        {!isUrgent && " — 30% lifetime discount for first 100 subscribers"}
      </span>

      <Link
        href="/dashboard/billing"
        className={`inline-flex items-center gap-1 rounded-md px-3 py-1 text-xs font-medium transition-colors ${
          isUrgent
            ? "bg-warning text-warning-foreground hover:bg-warning/90"
            : "bg-accent text-white hover:bg-accent/90"
        }`}
      >
        Subscribe
        <ArrowRight className="h-3 w-3" />
      </Link>

      <button
        type="button"
        onClick={() => {
          setDismissed(true);
          sessionStorage.setItem("bb_trial_banner_dismissed", "1");
        }}
        className="p-0.5 rounded hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
