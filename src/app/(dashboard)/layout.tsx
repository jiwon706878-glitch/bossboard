import type { Metadata } from "next";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { DashboardTopbar } from "@/components/dashboard/topbar";
import { LazyOverlays } from "@/components/dashboard/lazy-overlays";
import { DashboardPrefetcher } from "@/components/dashboard/prefetcher";
import { TabShell } from "@/components/dashboard/tab-shell";
import { ContextMenuBlocker } from "@/components/dashboard/context-menu-blocker";
import { GlobalShortcuts } from "@/components/dashboard/global-shortcuts";
import { TabAIChat } from "@/components/ai/tab-ai-chat";
import { TrialBanner } from "@/components/dashboard/trial-banner";
import { DmPanelProvider } from "@/components/dm/dm-panel-provider";

export const metadata: Metadata = {
  title: "Dashboard",
};

// Auth is handled by middleware — no server queries needed here.
// TabShell provides SPA-style instant tab switching with display:none caching.
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ContextMenuBlocker className="flex h-dvh overflow-hidden">
      <DashboardSidebar className="hidden lg:flex" />
      <div className="flex min-h-0 flex-1 flex-col">
        <TrialBanner />
        <DashboardTopbar />
        <TabShell>{children}</TabShell>
        <LazyOverlays />
        <DashboardPrefetcher />
        <GlobalShortcuts />
        <TabAIChat tab="wiki" context={{}} />
        <DmPanelProvider />
      </div>
    </ContextMenuBlocker>
  );
}
