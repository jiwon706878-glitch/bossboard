"use client";

import { usePathname } from "next/navigation";
import { Titlebar } from "@/components/desktop/titlebar";
import { Sidebar } from "@/components/desktop/sidebar";
import { OfflineBanner } from "@/components/desktop/offline-banner";
import { ThemeProvider } from "@/components/desktop/theme-provider";
import { GlobalContextMenu } from "@/components/desktop/global-context-menu";

export default function DesktopLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === "/desktop" || pathname === "/desktop/login";

  return (
    <ThemeProvider>
      <div className="bb-app-shell h-screen flex flex-col bg-bb-bg text-bb-fg overflow-hidden">
        <Titlebar />
        <OfflineBanner />
        <div className="flex-1 flex overflow-hidden">
          {!isAuthPage && <Sidebar />}
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
        <GlobalContextMenu />
      </div>
    </ThemeProvider>
  );
}
