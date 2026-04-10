"use client";

import { useAdminLang } from "@/lib/admin-i18n";
import { cn } from "@/lib/utils";

export function AdminLangToggle() {
  const { lang, setLang } = useAdminLang();

  return (
    <div className="inline-flex rounded-md border bg-card overflow-hidden">
      <button
        onClick={() => setLang("ko")}
        className={cn(
          "px-2.5 py-1 text-xs font-medium transition-colors",
          lang === "ko" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
        )}
        aria-label="Korean"
      >
        KR
      </button>
      <button
        onClick={() => setLang("en")}
        className={cn(
          "px-2.5 py-1 text-xs font-medium transition-colors border-l",
          lang === "en" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
        )}
        aria-label="English"
      >
        EN
      </button>
    </div>
  );
}
