"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Titlebar } from "@/components/desktop/titlebar";
import { Sidebar } from "@/components/desktop/sidebar";
import { OfflineBanner } from "@/components/desktop/offline-banner";
import { ThemeProvider } from "@/components/desktop/theme-provider";

export default function DesktopLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === "/desktop" || pathname === "/desktop/login";

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const isEditable =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;
      if (!isEditable) {
        // Custom <ContextMenu> wrappers call stopPropagation() so they never
        // reach this handler. This catch-all blocks the OS menu on bare canvas.
        e.preventDefault();
      }
    };
    window.addEventListener("contextmenu", handler);
    return () => window.removeEventListener("contextmenu", handler);
  }, []);

  return (
    <ThemeProvider>
      <div className="h-screen flex flex-col bg-[#0C0F17] dark:bg-[#0C0F17] text-white overflow-hidden">
        <Titlebar />
        <OfflineBanner />
        <div className="flex-1 flex overflow-hidden">
          {!isAuthPage && <Sidebar />}
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </div>
    </ThemeProvider>
  );
}
