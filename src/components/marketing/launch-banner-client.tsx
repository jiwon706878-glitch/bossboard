"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

const LS_KEY = "bb_beta_banner_dismissed";

interface LaunchBannerClientProps {
  /** Number of remaining Starter 30%-off slots, or null if not configured. */
  starterLeft: number | null;
  /** Number of remaining Pro 30%-off slots, or null if not configured. */
  proLeft: number | null;
}

/**
 * BB v2.0 beta banner — dismissible client component. Styled to the
 * project's "Calm Command Center" design system (see CLAUDE.md):
 * dark surface, thin accent border-bottom, no gradient, no emoji
 * in the headline. The parent server component only renders this
 * when there's something to announce.
 */
export function LaunchBannerClient({
  starterLeft,
  proLeft,
}: LaunchBannerClientProps) {
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

  // Build the discount-slots sub-message. If neither counter is set
  // (admin cleared them), fall back to a generic headline.
  const slotsParts: string[] = [];
  if (starterLeft !== null && starterLeft > 0) {
    slotsParts.push(`Starter: ${starterLeft} left`);
  }
  if (proLeft !== null && proLeft > 0) {
    slotsParts.push(`Pro: ${proLeft} left`);
  }
  const slotsMessage =
    slotsParts.length > 0
      ? slotsParts.join(" · ")
      : "First 100 subscribers — limited slots";

  return (
    <div
      className="relative px-4 py-2.5 text-center text-sm"
      style={{
        backgroundColor: "var(--card)",
        color: "var(--foreground)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <span>
        <strong style={{ color: "#4F8BFF" }}>Beta launch</strong>
        <span style={{ color: "var(--muted-foreground)" }}>
          {" · "}First 100 subscribers get 30% lifetime
        </span>
        <span style={{ color: "var(--muted-foreground)", opacity: 0.85 }}>
          {" · "}
          {slotsMessage}
        </span>{" "}
      </span>
      <a
        href="/#pricing"
        className="ml-1 font-semibold underline underline-offset-2 transition-opacity hover:opacity-80"
        style={{ color: "var(--foreground)" }}
      >
        Claim →
      </a>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss banner"
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 transition-colors hover:bg-[var(--background)]"
        style={{ color: "var(--muted-foreground)" }}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
