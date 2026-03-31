"use client";

import { Suspense, useCallback, memo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { plans, type PlanId } from "@/config/plans";
import {
  fetchCurrentUser,
  fetchProfile,
  fetchMonthlyUsage,
  userKeys,
  usageKeys,
} from "@/lib/queries";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  LayoutDashboard,
  CheckSquare,
  ListTodo,
  CalendarDays,
  NotebookPen,
  MessageSquare,
  MessageSquarePlus,
  Users,
  Settings,
  Activity,
  LogOut,
} from "lucide-react";
import { toast } from "sonner";
import { useBusinessStore } from "@/hooks/use-business";
import { FolderTree } from "@/components/sops/folder-tree";
import { FeedbackCard } from "@/components/dashboard/feedback-card";

const navLinks = [
  { key: "checklists", href: "/dashboard/checklists", label: "Checklists", icon: CheckSquare },
  { key: "todos", href: "/dashboard/todos", label: "Todos", icon: ListTodo },
  { key: "calendar", href: "/dashboard/calendar", label: "Calendar", icon: CalendarDays },
  { key: "journal", href: "/dashboard/journal", label: "Journal", icon: NotebookPen },
  { key: "board", href: "/dashboard/board", label: "Board", icon: MessageSquare },
  { key: "team", href: "/dashboard/team", label: "Team & Admin", icon: Users },
  { key: "settings", href: "/dashboard/settings", label: "Settings", icon: Settings },
];

const NavLink = memo(function NavLink({
  href,
  label,
  icon: Icon,
  pathname,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  pathname: string;
}) {
  const isActive =
    pathname === href ||
    (href !== "/dashboard" && pathname.startsWith(href));
  return (
    <Link href={href}>
      <Button
        variant={isActive ? "secondary" : "ghost"}
        className={cn(
          "w-full justify-start gap-3",
          isActive && "bg-primary/10 text-primary"
        )}
      >
        <Icon className="h-4 w-4" />
        {label}
      </Button>
    </Link>
  );
});

export function DashboardSidebar({ className }: { className?: string }) {
  const pathname = usePathname();
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
  });

  const { data: monthlyUsage = 0 } = useQuery({
    queryKey: usageKeys.monthly(userId ?? ""),
    queryFn: () => fetchMonthlyUsage(userId!),
    enabled: !!userId,
  });

  // Derived values
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
    router.refresh();
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

          {/* SOP Wiki folder tree */}
          <div className="py-1">
            <Suspense fallback={null}>
              <FolderTree />
            </Suspense>
          </div>

          {/* Other nav links */}
          {navLinks.map(({ key, ...link }) => (
            <NavLink key={key} {...link} pathname={pathname} />
          ))}
          {developerMode && (
            <NavLink href="/dashboard/agent-activity" label="Agent Activity" icon={Activity} pathname={pathname} />
          )}
        </div>
      </nav>

      {/* Bottom: Feedback + Log out */}
      <div className="border-t p-3 space-y-1">
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-muted-foreground"
            >
              <MessageSquarePlus className="h-4 w-4" />
              Feedback
            </Button>
          </SheetTrigger>
          <SheetContent side="right">
            <SheetHeader>
              <SheetTitle>Send Feedback</SheetTitle>
            </SheetHeader>
            <div className="pt-4">
              <FeedbackCard />
            </div>
          </SheetContent>
        </Sheet>
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Log out
        </Button>
      </div>
    </aside>
  );
}
