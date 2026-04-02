"use client";
import { useEffect } from "react";
export function ThemeLoader() {
  useEffect(() => {
    const color = localStorage.getItem("bossboard-theme-color");
    if (color) {
      const root = document.documentElement;
      root.style.setProperty("--primary", color);
      root.style.setProperty("--ring", color);
      root.style.setProperty("--sidebar-primary", color);
      root.style.setProperty("--sidebar-ring", color);
      root.style.setProperty("--primary-foreground", "#ffffff");
    }
  }, []);
  return null;
}
