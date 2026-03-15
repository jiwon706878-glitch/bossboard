"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { plans, type PlanId } from "@/config/plans";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  CheckSquare,
  GraduationCap,
  Users,
  Settings,
  Shield,
  LogOut,
} from "lucide-react";
import { useRoleStore } from "@/hooks/use-role";
import { toast } from "sonner";
import { FolderTree } from "@/components/sops/folder-tree";
import { QuickNoteSidebarButton } from "@/components/dashboard/quick-note";

const navLinks = [
  { key: "dashboard", href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "checklists", href: "/dashboard/checklists", label: "Checklists", icon: CheckSquare },
  { key: "onboarding", href: "/dashboard/onboarding-paths", label: "Onboarding", icon: GraduationCap },
  { key: "team", href: "/dashboard/settings", label: "Team", icon: Users },
  { key: "settings", href: "/dashboard/settings", label: "Settings", icon: Settings },
];

function NavLink({
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
}

export function DashboardSidebar({ className }: { className?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [userName, setUserName] = useState("");
  const [creditsUsed, setCreditsUsed] = useState(0);
  const [creditsLimit, setCreditsLimit] = useState(30);
  const [unlimited, setUnlimited] = useState(false);
  const { loadRole, isAdmin } = useRoleStore();

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, plan_id")
        .eq("id", user.id)
        .single();

      const name = profile?.full_name || user.email?.split("@")[0] || "User";
      setUserName(name);

      const planId = (profile?.plan_id as PlanId) ?? "free";
      const plan = plans[planId];
      const limit = plan.limits.aiCredits;
      if (limit === -1) {
        setUnlimited(true);
      } else {
        setCreditsLimit(limit);
      }

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const { data: usage } = await supabase
        .from("ai_usage")
        .select("credits_used")
        .eq("user_id", user.id)
        .gte("created_at", startOfMonth.toISOString());

      const total = usage?.reduce((sum, row) => sum + row.credits_used, 0) ?? 0;
      setCreditsUsed(total);
    }
    load();
    loadRole();
  }, [supabase, loadRole]);

  async function handleLogout() {
    await supabase.auth.signOut();
    toast.success("Logged out");
    router.push("/login");
    router.refresh();
  }

  const remaining = creditsLimit - creditsUsed;
  const progressPct = unlimited ? 0 : Math.min(100, (creditsUsed / creditsLimit) * 100);
  const initial = userName.charAt(0).toUpperCase();

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

          {/* Quick Note */}
          <div className="py-1">
            <QuickNoteSidebarButton />
          </div>

          {/* Other nav links */}
          {navLinks.map(({ key, ...link }) => (
            <NavLink key={key} {...link} pathname={pathname} />
          ))}

          {/* Admin link — only for owner/admin */}
          {isAdmin() && (
            <NavLink
              href="/dashboard/admin"
              label="Admin"
              icon={Shield}
              pathname={pathname}
            />
          )}
        </div>
      </nav>

      {/* Bottom: Log out */}
      <div className="border-t p-3">
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
