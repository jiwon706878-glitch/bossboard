"use client";

import { useCallback, useMemo, memo, useState } from "react";
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
  fetchUserBusinesses,
  userKeys,
  usageKeys,
  checklistKeys,
  businessKeys,
} from "@/lib/queries";
import { cn } from "@/lib/utils";
import { useBusinessStore, type Business } from "@/hooks/use-business";
import {
  LayoutDashboard,
  Library as LibraryIcon,
  CheckSquare,
  ListTodo,
  CalendarDays,
  MessageSquare,
  Settings,
  Activity,
  Code2,
  Plug,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

const supabase = createClient();

// ─── Navigation config ───────────────────────────────────────────────────────

const navLinks = [
  { key: "dashboard", href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "library", href: "/dashboard/sops", label: "Library", icon: LibraryIcon },
  { key: "checklists", href: "/dashboard/checklists", label: "Checklists", icon: CheckSquare },
  { key: "todos", href: "/dashboard/todos", label: "Todos", icon: ListTodo },
  { key: "board", href: "/dashboard/board", label: "Board", icon: MessageSquare },
  { key: "calendar", href: "/dashboard/calendar", label: "Calendar", icon: CalendarDays },
];

// Tab IDs map href → tab id for instant switching
const TAB_IDS: Record<string, string> = {
  "/dashboard": "dashboard",
  "/dashboard/sops": "sops",
  "/dashboard/checklists": "checklists",
  "/dashboard/todos": "todos",
  "/dashboard/calendar": "calendar",
  "/dashboard/board": "board",
  "/dashboard/team": "team",
  "/dashboard/settings": "settings",
  "/dashboard/agent-activity": "agent-activity",
  "/dashboard/api-docs": "api-docs",
  "/dashboard/mcp-guide": "mcp-guide",
};

// Workspace dot colors — derived from business id (stable)
const DOT_COLORS = [
  "bg-blue-500",
  "bg-emerald-500",
  "bg-violet-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-500",
];
function getDotColor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return DOT_COLORS[Math.abs(hash) % DOT_COLORS.length];
}

// ─── NavLink component ───────────────────────────────────────────────────────

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
    <a
      href={href}
      onClick={handleClick}
      onMouseEnter={onHover}
      className={cn(
        "relative flex items-center gap-3 px-5 py-2.5 text-sm font-medium transition-colors press-effect",
        isActive
          ? "text-primary"
          : "text-text-secondary hover:bg-surface hover:text-text-primary",
      )}
    >
      {/* Active indicator bar */}
      {isActive && (
        <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-primary" />
      )}
      <Icon className="h-[18px] w-[18px] shrink-0" />
      <span className="truncate">{label}</span>
    </a>
  );
});

// ─── Main sidebar ────────────────────────────────────────────────────────────

export function DashboardSidebar({ className }: { className?: string }) {
  const pathname = useActiveTab((s) => s.activePath);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [workspacesOpen, setWorkspacesOpen] = useState(true);

  // Shared queries
  const { data: user } = useQuery({
    queryKey: userKeys.current,
    queryFn: fetchCurrentUser,
    retry: false,
    staleTime: 5 * 60 * 1000,
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
    staleTime: 60 * 1000,
  });

  const { data: businesses = [] } = useQuery({
    queryKey: businessKeys.all(userId ?? ""),
    queryFn: () => fetchUserBusinesses(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  const currentBusiness = useBusinessStore((s) => s.currentBusiness);
  const setCurrentBusiness = useBusinessStore((s) => s.setCurrentBusiness);
  const bizId = currentBusiness?.id;

  const prefetchMap = useMemo(() => {
    if (!bizId) return {} as Record<string, () => void>;
    return {
      "/dashboard/checklists": () => queryClient.prefetchQuery({ queryKey: checklistKeys.all(bizId), queryFn: () => fetchAllChecklists(bizId), staleTime: 2 * 60 * 1000 }),
    } as Record<string, () => void>;
  }, [bizId, queryClient]);

  const profileLoaded = !!profile;
  const userName = profile?.full_name || user?.email?.split("@")[0] || "";
  const planId = (profile?.plan_id as PlanId) ?? "free";
  const plan = plans[planId];
  const creditsLimit = plan.limits.aiCredits;
  const unlimited = creditsLimit === -1;
  const creditsUsed = monthlyUsage;
  const remaining = (unlimited ? 0 : creditsLimit) - creditsUsed;
  const progressPct = unlimited ? 0 : Math.min(100, (creditsUsed / creditsLimit) * 100);
  const initial = userName ? userName.charAt(0).toUpperCase() : "";
  const developerMode = profile?.developer_mode ?? false;

  // Progress bar color tier
  const progressColor =
    progressPct > 80 ? "bg-error" : progressPct > 50 ? "bg-warning" : "bg-success";

  const handleSwitchWorkspace = useCallback(
    (biz: Business) => {
      if (biz.id === bizId) return;
      setCurrentBusiness(biz);
      // Invalidate business-scoped queries so the dashboard refetches
      queryClient.invalidateQueries();
    },
    [bizId, setCurrentBusiness, queryClient],
  );

  return (
    <aside
      className={cn(
        "flex h-full w-64 flex-col border-r border-border bg-bg-sidebar",
        className,
      )}
    >
      {/* ── Logo ────────────────────────────────────────── */}
      <div className="flex h-16 items-center gap-2.5 border-b border-border px-5">
        <img
          src="/logo.svg"
          alt="BossBoard"
          width={28}
          height={28}
          className="h-7 w-7"
          style={{ userSelect: "none" }}
          draggable={false}
          onContextMenu={(e) => e.preventDefault()}
        />
        <span className="text-base font-bold tracking-tight text-text-primary">BossBoard</span>
      </div>

      {/* ── User profile + credits ──────────────────────── */}
      <div className="border-b border-border px-5 py-4">
        {!profileLoaded ? (
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-surface" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="h-3.5 w-20 animate-pulse rounded bg-surface" />
              <div className="h-2.5 w-28 animate-pulse rounded bg-surface" />
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="Avatar"
                  className="h-8 w-8 shrink-0 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                  {initial}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-text-primary">{userName}</p>
                <p className="truncate text-[11px] text-text-secondary">
                  {plan.name}
                  {!unlimited && ` · ${remaining.toLocaleString()}/${creditsLimit.toLocaleString()} cr`}
                  {unlimited && " · Unlimited"}
                </p>
              </div>
            </div>
            {!unlimited && (
              <div className="mt-2.5">
                <div className="h-1 w-full overflow-hidden rounded-full bg-surface">
                  <div
                    className={cn("h-full rounded-full transition-all", progressColor)}
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Workspaces section ──────────────────────────── */}
      {businesses.length > 0 && (
        <div className="border-b border-border py-3">
          <button
            type="button"
            onClick={() => setWorkspacesOpen((o) => !o)}
            className="flex w-full items-center gap-1.5 px-5 py-1 text-[10px] font-semibold uppercase tracking-wider text-text-tertiary hover:text-text-secondary transition-colors"
          >
            {workspacesOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            Workspaces
          </button>
          {workspacesOpen && (
            <div className="mt-1 space-y-0.5">
              {businesses.map((biz) => {
                const isActive = biz.id === bizId;
                const dotColor = getDotColor(biz.id);
                return (
                  <button
                    key={biz.id}
                    type="button"
                    onClick={() => handleSwitchWorkspace(biz as Business)}
                    className={cn(
                      "flex w-full items-center gap-2.5 px-5 py-1.5 text-sm transition-colors press-effect",
                      isActive
                        ? "bg-surface text-text-primary font-medium"
                        : "text-text-secondary hover:bg-surface hover:text-text-primary",
                    )}
                  >
                    <span className={cn("h-2 w-2 shrink-0 rounded-full", dotColor)} />
                    <span className="truncate">{biz.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Navigation ──────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto py-3">
        <div className="px-5 pb-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
            Navigation
          </p>
        </div>
        <div className="space-y-0.5">
          {navLinks.map(({ key, ...link }) => (
            <NavLink key={key} {...link} pathname={pathname} onHover={prefetchMap[link.href]} />
          ))}
          {developerMode && (
            <>
              <div className="mt-3 px-5 pb-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
                  Developer
                </p>
              </div>
              <NavLink href="/dashboard/agent-activity" label="Agent Activity" icon={Activity} pathname={pathname} />
              <NavLink href="/dashboard/api-docs" label="API Docs" icon={Code2} pathname={pathname} />
              <NavLink href="/dashboard/mcp-guide" label="MCP Guide" icon={Plug} pathname={pathname} />
            </>
          )}
        </div>
      </nav>

      {/* ── Bottom: Settings ────────────────────────────── */}
      <div className="border-t border-border py-2">
        <NavLink
          href="/dashboard/settings"
          label="Settings"
          icon={Settings}
          pathname={pathname}
        />
      </div>
    </aside>
  );
}
