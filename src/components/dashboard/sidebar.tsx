"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { plans, type PlanId } from "@/config/plans";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Star,
  Share2,
  Video,
  BarChart3,
  CreditCard,
  Settings,
  LogOut,
  HelpCircle,
} from "lucide-react";
import { toast } from "sonner";

const aiToolsLinks = [
  { href: "/dashboard/reviews", label: "Reviews", icon: Star },
  { href: "/dashboard/social", label: "Social Media", icon: Share2 },
  { href: "/dashboard/scripts", label: "Content Studio", icon: Video },
];

const accountLinks = [
  { href: "/dashboard/usage", label: "AI Usage", icon: BarChart3 },
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
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

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Get profile
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

      // Get monthly usage
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
  }, [supabase]);

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
        <img src="/Logo.png" alt="" width={40} height={40} className="h-10 w-10" />
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
                ? "Unlimited credits"
                : `${remaining.toLocaleString()}/${creditsLimit.toLocaleString()} credits`}
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
      <nav className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* AI Tools section */}
        <div>
          <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            AI Tools
          </p>
          <div className="space-y-1">
            {aiToolsLinks.map((link) => (
              <NavLink key={link.href} {...link} pathname={pathname} />
            ))}
          </div>
        </div>

        {/* Account section */}
        <div>
          <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Account
          </p>
          <div className="space-y-1">
            {accountLinks.map((link) => (
              <NavLink key={link.href} {...link} pathname={pathname} />
            ))}
          </div>
        </div>
      </nav>

      {/* Bottom: Help + Log out */}
      <div className="border-t p-3 space-y-1">
        <Link href="/dashboard/settings">
          <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground">
            <HelpCircle className="h-4 w-4" />
            Help
          </Button>
        </Link>
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
