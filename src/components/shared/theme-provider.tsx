"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { useEffect, type ReactNode } from "react";

/**
 * BossBoard theme provider.
 *
 * Wraps next-themes and adds a `theme-transition` class to <html> after first
 * paint, so the initial render doesn't fade. Subsequent theme switches get a
 * smooth 400ms color crossfade (the "스르륵" effect).
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Enable transitions after first paint to prevent FOUC flash
    const timer = setTimeout(() => {
      document.documentElement.classList.add("theme-transition");
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  return (
    <NextThemesProvider attribute="class" defaultTheme="dark" enableSystem>
      {children}
    </NextThemesProvider>
  );
}
