"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useCallback } from "react";
import { Button } from "@/components/ui/button";

/**
 * Theme toggle button.
 *
 * Wraps the next-themes setTheme call in a temporary `theme-changing`
 * class on <html> so the smooth 400ms color crossfade only applies
 * during the actual switch — not during normal navigation.
 */
export function ThemeToggle() {
  const { setTheme, theme } = useTheme();

  const handleToggle = useCallback(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    root.classList.add("theme-changing");
    setTheme(theme === "light" ? "dark" : "light");
    // Remove the class after the transition completes
    window.setTimeout(() => {
      root.classList.remove("theme-changing");
    }, 450);
  }, [setTheme, theme]);

  return (
    <Button variant="ghost" size="icon" onClick={handleToggle} aria-label="Toggle theme">
      <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
