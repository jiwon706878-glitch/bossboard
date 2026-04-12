"use client";

import { useI18n, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Globe } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

const LOCALES: Array<{ value: Locale; label: string; flag: string }> = [
  { value: "en", label: "English", flag: "EN" },
  { value: "ko", label: "한국어", flag: "KR" },
];

export function LocaleSwitcher({ variant = "icon" }: { variant?: "icon" | "full" }) {
  const { locale, setLocale } = useI18n();

  if (variant === "full") {
    return (
      <div className="flex items-center gap-1 rounded-md border border-border p-0.5">
        {LOCALES.map((l) => (
          <button
            key={l.value}
            type="button"
            onClick={() => setLocale(l.value)}
            className={cn(
              "rounded px-2.5 py-1 text-xs font-medium transition-colors",
              locale === l.value
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {l.flag}
          </button>
        ))}
      </div>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Globe className="h-4 w-4" />
          <span className="sr-only">Language</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-36 p-1">
        {LOCALES.map((l) => (
          <button
            key={l.value}
            type="button"
            onClick={() => setLocale(l.value)}
            className={cn(
              "flex w-full items-center gap-2 rounded-sm px-3 py-1.5 text-sm transition-colors",
              locale === l.value
                ? "bg-primary/10 text-primary font-medium"
                : "hover:bg-muted"
            )}
          >
            <span className="text-xs font-mono w-5">{l.flag}</span>
            {l.label}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
