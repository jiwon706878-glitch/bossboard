"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ReactNode } from "react";

/**
 * BossBoard theme provider.
 *
 * Theme transitions are scoped to the actual toggle event via the
 * `theme-changing` class — see ThemeToggle component. This avoids
 * the performance penalty of a universal transition rule.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="dark" enableSystem>
      {children}
    </NextThemesProvider>
  );
}
