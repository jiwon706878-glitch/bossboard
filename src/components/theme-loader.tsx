"use client";
import { useEffect } from "react";
export function ThemeLoader() {
  useEffect(() => {
    const color = localStorage.getItem("bossboard-theme-color");
    if (color) document.documentElement.style.setProperty("--primary", color);
  }, []);
  return null;
}
