"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const THEME_COLORS = [
  { label: "Blue", value: "#3366FF" },
  { label: "Purple", value: "#7C3AED" },
  { label: "Green", value: "#059669" },
  { label: "Rose", value: "#E11D48" },
  { label: "Orange", value: "#EA580C" },
  { label: "Teal", value: "#0D9488" },
  { label: "Indigo", value: "#4F46E5" },
  { label: "Pink", value: "#DB2777" },
];

export function ThemeCard() {
  const [themeColor, setThemeColor] = useState<string>("#3366FF");
  const [customColor, setCustomColor] = useState<string>("");

  useEffect(() => {
    const saved = localStorage.getItem("bossboard-theme-color");
    if (saved) {
      setThemeColor(saved);
      if (!THEME_COLORS.some((c) => c.value === saved)) setCustomColor(saved);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function applyThemeColor(color: string) {
    setThemeColor(color);
    localStorage.setItem("bossboard-theme-color", color);
    const root = document.documentElement;
    root.style.setProperty("--primary", color);
    root.style.setProperty("--ring", color);
    root.style.setProperty("--sidebar-primary", color);
    root.style.setProperty("--sidebar-ring", color);
    root.style.setProperty("--primary-foreground", "#ffffff");
  }

  return (
    <Card>
      <CardHeader><CardTitle>Theme</CardTitle></CardHeader>
      <CardContent>
        <div className="space-y-3">
          <Label className="font-medium">Accent Color</Label>
          <div className="flex flex-wrap gap-2">
            {THEME_COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                title={c.label}
                aria-label={`Select ${c.label} theme`}
                className="h-8 w-8 rounded-full border-2 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                style={{
                  backgroundColor: c.value,
                  borderColor: themeColor === c.value ? c.value : "transparent",
                  boxShadow: themeColor === c.value ? `0 0 0 2px ${c.value}40` : "none",
                }}
                onClick={() => { setCustomColor(""); applyThemeColor(c.value); }}
              />
            ))}
          </div>
          <div className="flex items-center gap-2 pt-1">
            <Label className="text-sm text-muted-foreground shrink-0">Custom:</Label>
            <Input
              type="text"
              placeholder="#hex"
              value={customColor}
              onChange={(e) => setCustomColor(e.target.value)}
              className="h-8 w-28 text-sm font-mono"
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8"
              disabled={!/^#[0-9a-fA-F]{6}$/.test(customColor)}
              onClick={() => applyThemeColor(customColor)}
            >
              Apply
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
