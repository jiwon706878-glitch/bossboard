"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import type { ReactNode } from "react";

/**
 * Client-only shell that wraps the marketing <main> in AnimatePresence
 * keyed on pathname, so route changes fade. Lives in its own file so
 * the outer MarketingLayout can stay a server component (needed to
 * render the async LaunchBanner which fetches discount state).
 */
export function MarketingShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();

  // When the desktop app accidentally lands on a marketing route, redirect
  // straight to /desktop/dashboard. Web visitors are unaffected.
  useEffect(() => {
    if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
      router.replace("/desktop/dashboard");
    }
  }, [router]);

  return (
    <AnimatePresence mode="wait">
      <motion.main
        key={pathname}
        className="flex-1"
        initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={shouldReduceMotion ? undefined : { opacity: 0, y: -10 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.main>
    </AnimatePresence>
  );
}
