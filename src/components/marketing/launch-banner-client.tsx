"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

const LS_KEY = "bb_launch_banner_dismissed";

interface LaunchBannerClientProps {
  remaining: number;
}

/**
 * Client half of the launch banner. Handles per-browser dismissal
 * via localStorage. The parent server component (LaunchBanner)
 * fetches the discount state and only renders this when the promo
 * is still active, so there is nothing to check here beyond dismissal.
 */
export function LaunchBannerClient({ remaining }: LaunchBannerClientProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(LS_KEY);
    if (!dismissed) setShow(true);
  }, []);

  function dismiss() {
    localStorage.setItem(LS_KEY, "1");
    setShow(false);
  }

  if (!show) return null;

  return (
    <div
      className="relative px-4 py-2.5 text-center text-sm text-white"
      style={{
        background: "linear-gradient(90deg, #4A6CF7 0%, #A855F7 100%)",
      }}
    >
      <span className="font-medium">
        🎉 Launch Special · {remaining} spot{remaining === 1 ? "" : "s"} left
        {" "}— 30% lifetime discount on all paid plans{" "}
      </span>
      <a
        href="/#pricing"
        className="ml-1 font-semibold underline underline-offset-2 hover:opacity-90"
      >
        Claim Now →
      </a>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss banner"
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-white/80 hover:text-white hover:bg-white/10 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
