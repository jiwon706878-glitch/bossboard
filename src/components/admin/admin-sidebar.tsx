"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Users,
  DollarSign,
  BarChart3,
  MessageSquare,
  Inbox,
  ArrowLeft,
  LogOut,
  PieChart,
  TrendingUp,
  Tag,
} from "lucide-react";
import { useAdminLang } from "@/lib/admin-i18n";
import { toast } from "sonner";
import { useBusinessStore } from "@/hooks/use-business";

const linkConfigs = [
  { href: "/admin", labelKey: "overview" as const, icon: LayoutDashboard },
  { href: "/admin/inbox", labelKey: "inbox" as const, icon: Inbox },
  { href: "/admin/users", labelKey: "users" as const, icon: Users },
  { href: "/admin/revenue", labelKey: "revenue" as const, icon: DollarSign },
  { href: "/admin/usage", labelKey: "ai_usage" as const, icon: BarChart3 },
  { href: "/admin/analytics", labelKey: "analytics" as const, icon: PieChart },
  { href: "/admin/costs", labelKey: "costs" as const, icon: TrendingUp },
  { href: "/admin/promotions", labelKey: "promotions" as const, icon: Tag },
  { href: "/admin/feedback", labelKey: "feedback" as const, icon: MessageSquare },
];

export function AdminSidebar({ className }: { className?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const { t } = useAdminLang();

  async function handleLogout() {
    useBusinessStore.getState().clear();
    await supabase.auth.signOut();
    toast.success("Logged out");
    router.push("/login");
  }

  return (
    <aside className={cn("flex h-full w-64 flex-col border-r bg-card", className)}>
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white font-bold text-lg">
          Ad
        </div>
        <span className="text-lg font-bold">{t("admin_panel")}</span>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {linkConfigs.map((link) => {
          const isActive =
            pathname === link.href ||
            (link.href !== "/admin" && pathname.startsWith(link.href));
          return (
            <Link key={link.href} href={link.href}>
              <Button
                variant={isActive ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start gap-3",
                  isActive && "bg-primary/10 text-primary"
                )}
              >
                <link.icon className="h-4 w-4" />
                {t(link.labelKey)}
              </Button>
            </Link>
          );
        })}
      </nav>
      <div className="border-t p-3 space-y-1">
        <Link href="/dashboard">
          <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground">
            <ArrowLeft className="h-4 w-4" />
            {t("back_to_app")}
          </Button>
        </Link>
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          {t("log_out")}
        </Button>
      </div>
    </aside>
  );
}
