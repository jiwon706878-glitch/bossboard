"use client";

import { lazy, Suspense, useEffect, useState, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";
import { useActiveTab } from "@/hooks/use-active-tab";

// Eager import for the main dashboard (always needed first)
import DashboardPage from "@/app/(dashboard)/dashboard/page";

// Lazy imports for all other tabs
const SOPsPage = lazy(() => import("@/app/(dashboard)/dashboard/sops/page"));
const ChecklistsPage = lazy(() => import("@/app/(dashboard)/dashboard/checklists/page"));
const TodosPage = lazy(() => import("@/app/(dashboard)/dashboard/todos/page"));
const CalendarPage = lazy(() => import("@/app/(dashboard)/dashboard/calendar/page"));
const BoardPage = lazy(() => import("@/app/(dashboard)/dashboard/board/page"));
const TeamPage = lazy(() => import("@/app/(dashboard)/dashboard/team/page"));
const SettingsPage = lazy(() => import("@/app/(dashboard)/dashboard/settings/page"));
const AgentActivityPage = lazy(() => import("@/app/(dashboard)/dashboard/agent-activity/page"));
const ApiDocsPage = lazy(() => import("@/app/(dashboard)/dashboard/api-docs/page"));
const McpGuidePage = lazy(() => import("@/app/(dashboard)/dashboard/mcp-guide/page"));
const BillingPage = lazy(() => import("@/app/(dashboard)/dashboard/billing/page"));
const OnboardingPathsPage = lazy(() => import("@/app/(dashboard)/dashboard/onboarding-paths/page"));

interface TabDef {
  id: string;
  path: string;
  Component: React.ComponentType;
}

const TABS: TabDef[] = [
  { id: "dashboard", path: "/dashboard", Component: DashboardPage },
  { id: "sops", path: "/dashboard/sops", Component: SOPsPage },
  { id: "checklists", path: "/dashboard/checklists", Component: ChecklistsPage },
  { id: "todos", path: "/dashboard/todos", Component: TodosPage },
  { id: "calendar", path: "/dashboard/calendar", Component: CalendarPage },
  { id: "board", path: "/dashboard/board", Component: BoardPage },
  { id: "team", path: "/dashboard/team", Component: TeamPage },
  { id: "settings", path: "/dashboard/settings", Component: SettingsPage },
  { id: "agent-activity", path: "/dashboard/agent-activity", Component: AgentActivityPage },
  { id: "api-docs", path: "/dashboard/api-docs", Component: ApiDocsPage },
  { id: "mcp-guide", path: "/dashboard/mcp-guide", Component: McpGuidePage },
  { id: "billing", path: "/dashboard/billing", Component: BillingPage },
  { id: "onboarding-paths", path: "/dashboard/onboarding-paths", Component: OnboardingPathsPage },
];

const TAB_PATHS = new Set(TABS.map((t) => t.path));

// Priority tabs — mounted eagerly on first idle frame
const PRIORITY_IDS = new Set(["dashboard", "sops", "todos", "calendar", "board", "checklists", "settings"]);

// Sub-routes that need normal Next.js routing (not tabs)
function isSubRoute(pathname: string): boolean {
  if (TAB_PATHS.has(pathname)) return false;
  if (pathname === "/dashboard") return false;
  return pathname.startsWith("/dashboard/");
}

function findTabForPath(pathname: string): string | null {
  const exact = TABS.find((t) => t.path === pathname);
  if (exact) return exact.id;
  if (pathname === "/dashboard") return "dashboard";
  return null;
}

const TabSkeleton = () => (
  <div className="mx-auto max-w-2xl space-y-6 animate-pulse">
    <div className="h-8 w-48 rounded-md bg-muted" />
    <div className="h-4 w-64 rounded bg-muted" />
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-16 rounded-md border bg-muted/40" />
      ))}
    </div>
  </div>
);

export function TabShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState<string>(() => findTabForPath(pathname) ?? "dashboard");
  const [mountedTabs, setMountedTabs] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    const tab = findTabForPath(pathname);
    if (tab) initial.add(tab);
    // Always mount dashboard
    initial.add("dashboard");
    return initial;
  });
  const mainRef = useRef<HTMLDivElement>(null);

  const setActivePath = useActiveTab((s) => s.setActivePath);

  // Switch tab — pure synchronous state update + pushState
  const switchTab = useCallback((tabId: string, pushState = true) => {
    const tab = TABS.find((t) => t.id === tabId);
    if (!tab) return;
    // Mount if needed
    setMountedTabs((prev) => {
      if (prev.has(tabId)) return prev;
      const next = new Set(prev);
      next.add(tabId);
      return next;
    });
    // Synchronous URL update — no router navigation
    if (pushState && window.location.pathname !== tab.path) {
      window.history.pushState({ tabId }, "", tab.path);
    }
    setActiveTab(tabId);
    setActivePath(tab.path);
    // Scroll to top
    mainRef.current?.scrollTo(0, 0);
  }, [setActivePath]);

  // Listen for sidebar tab switch events
  useEffect(() => {
    function handleSwitch(e: Event) {
      const tabId = (e as CustomEvent<string>).detail;
      switchTab(tabId);
    }
    window.addEventListener("dashboard-switch-tab", handleSwitch);
    return () => window.removeEventListener("dashboard-switch-tab", handleSwitch);
  }, [switchTab]);

  // Handle browser back/forward
  useEffect(() => {
    function handlePopState() {
      const tab = findTabForPath(window.location.pathname);
      if (tab) {
        switchTab(tab, false);
      }
    }
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [switchTab]);

  // Sync with Next.js pathname (for initial load and sub-route returns)
  useEffect(() => {
    setActivePath(pathname);
    const tab = findTabForPath(pathname);
    if (tab && tab !== activeTab) {
      setActiveTab(tab);
      setMountedTabs((prev) => {
        if (prev.has(tab)) return prev;
        const next = new Set(prev);
        next.add(tab);
        return next;
      });
    }
  }, [pathname, activeTab, setActivePath]);

  // Pre-load core tab JS bundles immediately so lazy() resolves instantly
  useEffect(() => {
    import("@/app/(dashboard)/dashboard/sops/page");
    import("@/app/(dashboard)/dashboard/todos/page");
    import("@/app/(dashboard)/dashboard/calendar/page");
    import("@/app/(dashboard)/dashboard/board/page");
    import("@/app/(dashboard)/dashboard/checklists/page");
    import("@/app/(dashboard)/dashboard/settings/page");
    import("@/app/(dashboard)/dashboard/team/page");
  }, []);

  // Mount priority tabs on first idle callback (not a fixed 1500ms delay)
  useEffect(() => {
    const idle = typeof window !== "undefined" && "requestIdleCallback" in window
      ? (window as unknown as { requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => number }).requestIdleCallback
      : (cb: () => void) => setTimeout(cb, 100);

    const handle = idle(() => {
      setMountedTabs((prev) => {
        const next = new Set(prev);
        PRIORITY_IDS.forEach((id) => next.add(id));
        return next;
      });
    }, { timeout: 800 });

    return () => {
      if ("cancelIdleCallback" in window) {
        (window as unknown as { cancelIdleCallback: (id: number) => void }).cancelIdleCallback(handle as number);
      }
    };
  }, []);

  // Defer mounting remaining (non-priority) tabs until next idle
  useEffect(() => {
    const idle = typeof window !== "undefined" && "requestIdleCallback" in window
      ? (window as unknown as { requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => number }).requestIdleCallback
      : (cb: () => void) => setTimeout(cb, 300);

    const handle = idle(() => {
      setMountedTabs((prev) => {
        const next = new Set(prev);
        TABS.forEach((t) => next.add(t.id));
        return next;
      });
    }, { timeout: 3000 });

    return () => {
      if ("cancelIdleCallback" in window) {
        (window as unknown as { cancelIdleCallback: (id: number) => void }).cancelIdleCallback(handle as number);
      }
    };
  }, []);

  const showingSubRoute = isSubRoute(pathname);

  return (
    <div ref={mainRef} className="min-h-0 flex-1 overflow-y-auto">
      {/* Sub-route content (normal Next.js routing) */}
      {showingSubRoute && (
        <div className="p-4 lg:p-6">
          {children}
        </div>
      )}

      {/* Tab content — display toggled, never unmounted once mounted */}
      {TABS.map((tab) => {
        if (!mountedTabs.has(tab.id)) return null;
        const isVisible = !showingSubRoute && activeTab === tab.id;
        return (
          <div
            key={tab.id}
            style={{ display: isVisible ? "block" : "none" }}
            className="p-4 lg:p-6"
          >
            <Suspense fallback={<TabSkeleton />}>
              <tab.Component />
            </Suspense>
          </div>
        );
      })}
    </div>
  );
}
