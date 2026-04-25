"use client";

import { usePathname } from "next/navigation";
import { Titlebar } from "@/components/desktop/titlebar";
import { Sidebar } from "@/components/desktop/sidebar";
import { OfflineBanner } from "@/components/desktop/offline-banner";

export default function DesktopLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isAuthPage = pathname === "/desktop" || pathname === "/desktop/login";

  return (
    <div className="h-screen flex flex-col bg-[#0C0F17] text-white overflow-hidden">
      <Titlebar />
      <OfflineBanner />

      <div className="flex-1 flex overflow-hidden">
        {!isAuthPage && <Sidebar />}
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
