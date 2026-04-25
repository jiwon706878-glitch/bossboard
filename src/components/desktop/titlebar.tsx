"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  Bell,
  MessageSquare,
  Search,
  Sun,
  Moon,
  Minus,
  Square,
  X,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { isTauri } from "@/lib/tauri/fs";
import { useTheme } from "@/components/desktop/theme-provider";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/desktop/avatar";
import { NotificationsPanel } from "@/components/desktop/notifications-panel";

export function Titlebar() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    setCanGoBack(window.history.length > 1);
    setSidebarCollapsed(localStorage.getItem("bb_sidebar_collapsed") === "true");

    const onSidebar = (e: Event) => {
      const detail = (e as CustomEvent<{ collapsed: boolean }>).detail;
      if (detail) setSidebarCollapsed(detail.collapsed);
    };
    window.addEventListener("bb-sidebar-toggle", onSidebar);

    const supabase = createClient();
    supabase.auth.getSession().then(({ data }: { data: { session: Session | null } }) => {
      const session = data.session;
      setUser(session?.user?.email ? { email: session.user.email } : null);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        setUser(session?.user?.email ? { email: session.user.email } : null);
      },
    );
    return () => {
      subscription.unsubscribe();
      window.removeEventListener("bb-sidebar-toggle", onSidebar);
    };
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchExpanded(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  function toggleSidebar() {
    const next = !sidebarCollapsed;
    setSidebarCollapsed(next);
    localStorage.setItem("bb_sidebar_collapsed", String(next));
    window.dispatchEvent(new CustomEvent("bb-sidebar-toggle", { detail: { collapsed: next } }));
  }

  async function handleMinimize() {
    if (!isTauri()) return;
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    await getCurrentWindow().minimize();
  }
  async function handleMaximize() {
    if (!isTauri()) return;
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    await getCurrentWindow().toggleMaximize();
  }
  async function handleClose() {
    if (!isTauri()) return;
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    await getCurrentWindow().close();
  }
  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setProfileMenuOpen(false);
    router.replace("/desktop/login");
  }
  function sendFeedback() {
    if (typeof window !== "undefined") {
      window.location.href = "mailto:jay@mybossboard.com?subject=BossBoard%20feedback";
    }
  }

  return (
    <>
      <div
        data-tauri-drag-region
        className="h-12 bg-bb-bg border-b border-bb-border flex items-center px-3 select-none relative"
      >
        <button
          onClick={toggleSidebar}
          className="p-2 hover:bg-bb-card rounded mr-1"
          title={sidebarCollapsed ? "Expand sidebar (Ctrl+B)" : "Collapse sidebar (Ctrl+B)"}
        >
          {sidebarCollapsed ? (
            <PanelLeft className="w-4 h-4 text-gray-400" />
          ) : (
            <PanelLeftClose className="w-4 h-4 text-gray-400" />
          )}
        </button>

        <div className="flex items-center gap-0.5 mr-2">
          <button
            onClick={() => router.back()}
            disabled={!canGoBack}
            className="p-1.5 hover:bg-bb-card rounded disabled:opacity-30"
            title="Back"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-gray-400" />
          </button>
          <button
            onClick={() => router.forward()}
            className="p-1.5 hover:bg-bb-card rounded"
            title="Forward"
          >
            <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
          </button>
        </div>

        <div data-tauri-drag-region className="flex-1 h-full" />

        <div className="flex items-center gap-1">
          {searchExpanded ? (
            <div className="flex items-center gap-2 px-3 py-1 bg-bb-card border border-bb-primary rounded-md w-72 mr-1">
              <Search className="w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search BossBoard..."
                autoFocus
                onBlur={() => setSearchExpanded(false)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setSearchExpanded(false);
                }}
                className="flex-1 bg-transparent text-sm text-bb-fg outline-none"
              />
              <span className="text-[10px] text-gray-500">Esc</span>
            </div>
          ) : (
            <button
              onClick={() => setSearchExpanded(true)}
              className="p-2 hover:bg-bb-card rounded"
              title="Search (Ctrl+K)"
            >
              <Search className="w-4 h-4 text-gray-400" />
            </button>
          )}

          <button
            onClick={() => window.location.reload()}
            className="p-2 hover:bg-bb-card rounded"
            title="Refresh (Ctrl+R)"
          >
            <RefreshCw className="w-4 h-4 text-gray-400" />
          </button>

          <button
            onClick={() => setNotificationsOpen((o) => !o)}
            className="p-2 hover:bg-bb-card rounded relative"
            title="Notifications"
          >
            <Bell className="w-4 h-4 text-gray-400" />
          </button>

          <button
            onClick={() => window.dispatchEvent(new Event("bb-dm-toggle"))}
            className="p-2 hover:bg-bb-card rounded"
            title="Direct Messages (Ctrl+Shift+D)"
          >
            <MessageSquare className="w-4 h-4 text-gray-400" />
          </button>

          <button
            onClick={toggleTheme}
            className="p-2 hover:bg-bb-card rounded"
            title="Toggle theme"
          >
            {theme === "dark" ? (
              <Moon className="w-4 h-4 text-gray-400" />
            ) : (
              <Sun className="w-4 h-4 text-gray-400" />
            )}
          </button>

          {user && (
            <div className="relative ml-1">
              <button
                onClick={() => setProfileMenuOpen((o) => !o)}
                className="rounded-full hover:ring-2 hover:ring-bb-primary transition"
                title={user.email}
              >
                <Avatar email={user.email} size="md" />
              </button>
              {profileMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setProfileMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-12 w-60 bg-bb-card border border-bb-border rounded-md shadow-xl z-50">
                    <div className="p-3 border-b border-bb-border">
                      <div className="text-xs text-gray-500">Signed in as</div>
                      <div className="text-sm truncate">{user.email}</div>
                    </div>
                    <button
                      onClick={() => {
                        router.push("/desktop/settings");
                        setProfileMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-bb-bg"
                    >
                      Settings
                    </button>
                    <button
                      onClick={() => {
                        window.dispatchEvent(new Event("bb-shortcuts-open"));
                        setProfileMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-bb-bg"
                    >
                      Keyboard shortcuts
                    </button>
                    <button
                      onClick={() => {
                        window.dispatchEvent(new Event("bb-about-open"));
                        setProfileMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-bb-bg"
                    >
                      About BossBoard
                    </button>
                    <button
                      onClick={() => {
                        sendFeedback();
                        setProfileMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-bb-bg border-t border-bb-border"
                    >
                      Send feedback
                    </button>
                    <button
                      onClick={handleSignOut}
                      className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-bb-bg"
                    >
                      Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          <div className="w-px h-4 bg-bb-border mx-1" />
          <button onClick={handleMinimize} className="p-2 hover:bg-bb-card rounded" title="Minimize">
            <Minus className="w-4 h-4 text-gray-400" />
          </button>
          <button onClick={handleMaximize} className="p-2 hover:bg-bb-card rounded" title="Maximize">
            <Square className="w-3.5 h-3.5 text-gray-400" />
          </button>
          <button onClick={handleClose} className="p-2 hover:bg-red-600 rounded" title="Close">
            <X className="w-4 h-4 text-gray-400 hover:text-white" />
          </button>
        </div>
      </div>

      <NotificationsPanel
        isOpen={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
      />
    </>
  );
}
