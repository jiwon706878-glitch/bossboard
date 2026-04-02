"use client";

import { useCallback, memo } from "react";
import { useRouter } from "next/navigation";
import { useActiveTab } from "@/hooks/use-active-tab";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { plans, type PlanId } from "@/config/plans";
import {
  fetchCurrentUser,
  fetchProfile,
  fetchMonthlyUsage,
  fetchAllChecklists,
  userKeys,
  usageKeys,
  checklistKeys,
} from "@/lib/queries";
import { cn } from "@/lib/utils";
import { useBusinessStore } from "@/hooks/use-business";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  FileText,
  CheckSquare,
  ListTodo,
  CalendarDays,
  NotebookPen,
  MessageSquare,
  Users,
  Settings,
  Activity,
  Code2,
  Plug,
  LogOut,
} from "lucide-react";
import { toast } from "sonner";

const navLinks = [
  { key: "wiki", href: "/dashboard/sops", label: "Wiki", icon: FileText },
  { key: "checklists", href: "/dashboard/checklists", label: "Checklists", icon: CheckSquare },
  { key: "todos", href: "/dashboard/todos", label: "Todos", icon: ListTodo },
  { key: "calendar", href: "/dashboard/calendar", label: "Calendar", icon: CalendarDays },
  { key: "journal", href: "/dashboard/journal", label: "Journal", icon: NotebookPen },
  { key: "board", href: "/dashboard/board", label: "Board", icon: MessageSquare },
  { key: "team", href: "/dashboard/team", label: "Team & Admin", icon: Users },
  { key: "settings", href: "/dashboard/settings", label: "Settings", icon: Settings },
];

// Tab IDs map href → tab id for instant switching
const TAB_IDS: Record<string, string> = {
  "/dashboard": "dashboard",
  "/dashboard/sops": "sops",
  "/dashboard/checklists": "checklists",
  "/dashboard/todos": "todos",
  "/dashboard/calendar": "calendar",
  "/dashboard/journal": "journal",
  "/dashboard/board": "board",
  "/dashboard/team": "team",
  "/dashboard/settings": "settings",
  "/dashboard/agent-activity": "agent-activity",
  "/dashboard/api-docs": "api-docs",
  "/dashboard/mcp-guide": "mcp-guide",
};

const NavLink = memo(function NavLink({
  href,
  label,
  icon: Icon,
  pathname,
  onHover,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  pathname: string;
  onHover?: () => void;
}) {
  const isActive =
    pathname === href ||
    (href !== "/dashboard" && pathname.startsWith(href));

  const tabId = TAB_IDS[href];

  function handleClick(e: React.MouseEvent) {
    if (tabId) {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent("dashboard-switch-tab", { detail: tabId }));
    }
  }

  return (
    <a href={href} onClick={handleClick} onMouseEnter={onHover}>
      <Button
        variant={isActive ? "secondary" : "ghost"}
        className={cn(
          "w-full justify-start gap-3 h-9 flex-nowrap overflow-hidden",
          isActive && "bg-primary/10 text-primary"
        )}
      >
        <Icon className="h-4 w-4 shrink-0 min-w-[16px]" />
        <span className="truncate">{label}</span>
      </Button>
    </a>
  );
});

export function DashboardSidebar({ className }: { className?: string }) {
  const pathname = useActiveTab((s) => s.activePath);
  const router = useRouter();
  const supabase = createClient();
  const queryClient = useQueryClient();

  // Shared queries — same cache as dashboard page
  const { data: user } = useQuery({
    queryKey: userKeys.current,
    queryFn: fetchCurrentUser,
    retry: false,
  });

  const userId = user?.id;

  const { data: profile } = useQuery({
    queryKey: userKeys.profile(userId ?? ""),
    queryFn: () => fetchProfile(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  const { data: monthlyUsage = 0 } = useQuery({
    queryKey: usageKeys.monthly(userId ?? ""),
    queryFn: () => fetchMonthlyUsage(userId!),
    enabled: !!userId,
  });

  const currentBusiness = useBusinessStore((s) => s.currentBusiness);
  const bizId = currentBusiness?.id;

  const prefetchMap: Record<string, () => void> = bizId ? {
    "/dashboard/checklists": () => queryClient.prefetchQuery({ queryKey: checklistKeys.all(bizId), queryFn: () => fetchAllChecklists(bizId), staleTime: 2 * 60 * 1000 }),
  } : {};

  const profileLoaded = !!profile;

  // Derived values (only used after profile loads)
  const userName = profile?.full_name || user?.email?.split("@")[0] || "";
  const planId = (profile?.plan_id as PlanId) ?? "free";
  const plan = plans[planId];
  const creditsLimit = plan.limits.aiCredits;
  const unlimited = creditsLimit === -1;
  const creditsUsed = monthlyUsage;
  const developerMode = profile?.developer_mode ?? false;

  const remaining = (unlimited ? 0 : creditsLimit) - creditsUsed;
  const progressPct = unlimited ? 0 : Math.min(100, (creditsUsed / creditsLimit) * 100);
  const initial = userName ? userName.charAt(0).toUpperCase() : "";

  const handleLogout = useCallback(async () => {
    useBusinessStore.getState().clear();
    queryClient.clear();
    await supabase.auth.signOut();
    toast.success("Logged out");
    router.push("/login");
  }, [supabase, router, queryClient]);

  return (
    <aside
      className={cn(
        "flex h-full w-64 flex-col border-r bg-card",
        className
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <img src="/logo.svg" alt="BossBoard" width={32} height={32} className="h-8 w-8" style={{ userSelect: "none" }} draggable={false} onContextMenu={(e) => e.preventDefault()} />
        <span className="text-lg font-bold">BossBoard</span>
      </div>

      {/* User profile + credits */}
      <div className="border-b px-4 py-4">
        {!profileLoaded ? (
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-muted" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              <div className="h-3 w-32 animate-pulse rounded bg-muted" />
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                {initial}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{userName}</p>
                <p className="text-xs text-muted-foreground">
                  {unlimited
                    ? "Unlimited generations"
                    : `${remaining.toLocaleString()}/${creditsLimit.toLocaleString()} generations`}
                </p>
              </div>
            </div>
            {!unlimited && (
              <div className="mt-3">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      progressPct > 90 ? "bg-destructive" : "bg-primary"
                    )}
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {creditsUsed.toLocaleString()} used this month
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3">
        <div className="space-y-1">
          {/* Dashboard link */}
          <NavLink
            href="/dashboard"
            label="Dashboard"
            icon={LayoutDashboard}
            pathname={pathname}
          />

          {/* Nav links */}
          {navLinks.map(({ key, ...link }) => (
            <NavLink key={key} {...link} pathname={pathname} onHover={prefetchMap[link.href]} />
          ))}
          {developerMode && (
            <>
              <div className="mt-2 mb-1 px-3">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Developer</p>
              </div>
              <NavLink href="/dashboard/agent-activity" label="Agent Activity" icon={Activity} pathname={pathname} />
              <NavLink href="/dashboard/api-docs" label="API Docs" icon={Code2} pathname={pathname} />
              <NavLink href="/dashboard/mcp-guide" label="MCP Guide" icon={Plug} pathname={pathname} />
            </>
          )}
        </div>
      </nav>

      {/* Bottom: Log out */}
      <div className="border-t p-3">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 h-9 flex-nowrap overflow-hidden text-muted-foreground"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 shrink-0 min-w-[16px]" />
          <span className="truncate">Log out</span>
        </Button>
      </div>
    </aside>
  );
}
