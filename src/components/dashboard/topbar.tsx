"use client";

import { memo, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Menu, Search, MessageSquarePlus, LogOut, User as UserIcon, Settings as SettingsIcon, Send } from "lucide-react";
import { useDmPanel } from "@/hooks/use-dm-panel";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { LocaleSwitcher } from "@/components/shared/locale-switcher";
import { DashboardSidebar } from "./sidebar";
import { NotificationBell } from "./notification-bell";
import { SearchDropdown } from "./search-dropdown";
import { FeedbackCard } from "./feedback-card";
import { RefreshButton } from "./refresh-button";
import { fetchCurrentUser, fetchProfile, userKeys } from "@/lib/queries";
import { useBusinessStore } from "@/hooks/use-business";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

const supabase = createClient();

// ─── User menu dropdown ──────────────────────────────────────────────────────

function UserMenu() {
  const router = useRouter();
  const queryClient = useQueryClient();

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

  const handleLogout = useCallback(async () => {
    useBusinessStore.getState().clear();
    queryClient.clear();
    await supabase.auth.signOut();
    toast.success("Logged out");
    router.push("/login");
  }, [router, queryClient]);

  const userName = profile?.full_name || user?.email?.split("@")[0] || "";
  const initial = userName ? userName.charAt(0).toUpperCase() : "?";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white press-effect hover:brightness-110 transition-all"
          aria-label="Account menu"
        >
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt="Avatar"
              className="h-8 w-8 rounded-full object-cover"
            />
          ) : (
            initial
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-1 animate-popover-enter">
        <div className="border-b border-border px-3 py-2.5">
          <p className="truncate text-sm font-semibold text-text-primary">{userName}</p>
          <p className="truncate text-xs text-text-secondary">{user?.email ?? ""}</p>
        </div>
        <div className="py-1">
          <a
            href="/dashboard/settings"
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-text-primary hover:bg-surface transition-colors"
          >
            <UserIcon className="h-4 w-4 text-text-secondary" />
            Profile
          </a>
          <a
            href="/dashboard/settings"
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-text-primary hover:bg-surface transition-colors"
          >
            <SettingsIcon className="h-4 w-4 text-text-secondary" />
            Settings
          </a>
        </div>
        <div className="border-t border-border py-1">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-error hover:bg-surface transition-colors press-effect"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ─── Topbar ──────────────────────────────────────────────────────────────────

function DmButton() {
  const { openPanel } = useDmPanel();
  return (
    <Button variant="ghost" size="icon" onClick={() => openPanel()} title="Messages">
      <Send className="h-4 w-4" />
    </Button>
  );
}

export const DashboardTopbar = memo(function DashboardTopbar() {
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <header className="flex h-16 items-center justify-between border-b border-border bg-bg px-4 lg:px-6">
        {/* ── Left: Mobile menu toggle ── */}
        <div className="flex items-center gap-3">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <DashboardSidebar />
            </SheetContent>
          </Sheet>
        </div>

        {/* ── Center: Search bar ── */}
        <div className="hidden flex-1 sm:flex justify-center max-w-xl mx-auto">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="flex w-full max-w-md items-center gap-2.5 rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-text-secondary hover:border-text-tertiary transition-colors press-effect"
          >
            <Search className="h-4 w-4 shrink-0" />
            <span className="flex-1 text-left">Search BossBoard...</span>
            <kbd className="ml-2 hidden md:inline-flex rounded border border-border bg-bg px-1.5 py-0.5 text-[10px] font-mono text-text-tertiary">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* ── Right: Actions ── */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="sm:hidden"
            onClick={() => setSearchOpen(true)}
            aria-label="Search"
          >
            <Search className="h-4 w-4" />
          </Button>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="hidden md:inline-flex gap-1.5 text-text-secondary">
                <MessageSquarePlus className="h-4 w-4" />
                <span className="text-xs">Send Feedback</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-4 animate-popover-enter">
              <h3 className="text-sm font-semibold mb-3">Send Feedback</h3>
              <FeedbackCard />
            </PopoverContent>
          </Popover>

          {/* Mobile feedback icon */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Send feedback">
                <MessageSquarePlus className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-4 animate-popover-enter">
              <h3 className="text-sm font-semibold mb-3">Send Feedback</h3>
              <FeedbackCard />
            </PopoverContent>
          </Popover>

          <RefreshButton />
          <DmButton />
          <NotificationBell />
          <LocaleSwitcher />
          <ThemeToggle />
          <div className="ml-1">
            <UserMenu />
          </div>
        </div>
      </header>
      <SearchDropdown open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
});
