import type { Metadata } from "next";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { DashboardTopbar } from "@/components/dashboard/topbar";
import { LazyOverlays } from "@/components/dashboard/lazy-overlays";

export const metadata: Metadata = {
  title: "Dashboard",
};

// Auth is handled by middleware — no server queries needed here.
// This makes tab switching instant (no server roundtrip per navigation).
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-dvh overflow-hidden">
      <DashboardSidebar className="hidden lg:flex" />
      <div className="flex min-h-0 flex-1 flex-col">
        <DashboardTopbar />
        <main className="min-h-0 flex-1 overflow-y-auto p-4 lg:p-6 animate-fade-in">
          {children}
        </main>
        <LazyOverlays />
      </div>
    </div>
  );
}
