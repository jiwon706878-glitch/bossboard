"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useCallback } from "react";
import { Button } from "@/components/ui/button";

/**
 * Theme toggle button.
 *
 * Modern browsers (Chrome, Edge, Safari 18+): Uses the View Transitions
 * API for a buttery smooth full-screen crossfade.
 *
 * Older browsers (Firefox, older Safari): Falls back to CSS transitions
 * scoped via the `theme-changing` class, which is added before the
 * switch and removed 550ms later.
 */
export function ThemeToggle() {
  const { setTheme, theme } = useTheme();

  const handleToggle = useCallback(() => {
    if (typeof document === "undefined") return;
    const nextTheme = theme === "light" ? "dark" : "light";

    // Hint the browser to optimize for these properties during transition
    document.body.style.willChange = "background-color, color";

    const cleanup = () => {
      document.body.style.willChange = "auto";
    };

    // Modern path: View Transitions API (Chrome, Edge, Safari 18+)
    if (typeof document.startViewTransition === "function") {
      const transition = document.startViewTransition(() => {
        setTheme(nextTheme);
      });
      transition.finished.finally(cleanup);
      return;
    }

    // Fallback path: CSS class + setTimeout (Firefox, older Safari)
    const root = document.documentElement;
    root.classList.add("theme-changing");
    setTheme(nextTheme);
    window.setTimeout(() => {
      root.classList.remove("theme-changing");
      cleanup();
    }, 550);
  }, [setTheme, theme]);

  return (
    <Button variant="ghost" size="icon" onClick={handleToggle} aria-label="Toggle theme">
      <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
