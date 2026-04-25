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
} from "lucide-react";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { isTauri } from "@/lib/tauri/fs";
import { useTheme } from "@/components/desktop/theme-provider";
import { createClient } from "@/lib/supabase/client";

export function Titlebar() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [user, setUser] = useState<{ email: string; initial: string } | null>(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  useEffect(() => {
    setCanGoBack(window.history.length > 1);

    const supabase = createClient();
    supabase.auth.getSession().then(({ data }: { data: { session: Session | null } }) => {
      const session = data.session;
      if (session?.user?.email) {
        setUser({
          email: session.user.email,
          initial: session.user.email[0].toUpperCase(),
        });
      } else {
        setUser(null);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        if (session?.user?.email) {
          setUser({
            email: session.user.email,
            initial: session.user.email[0].toUpperCase(),
          });
        } else {
          setUser(null);
        }
      },
    );
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchExpanded(true);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "r") {
        e.preventDefault();
        window.location.reload();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

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

  return (
    <div
      data-tauri-drag-region
      className="h-12 bg-[#0C0F17] border-b border-gray-800 flex items-center px-3 select-none relative"
    >
      <div className="flex items-center gap-2 min-w-0 mr-4">
        <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-blue-700 rounded-md flex items-center justify-center font-bold text-white text-sm shadow-md">
          B
        </div>
        <div className="font-semibold text-white">BossBoard</div>
      </div>

      <div className="flex items-center gap-0.5 mr-2">
        <button
          onClick={() => router.back()}
          disabled={!canGoBack}
          className="p-1.5 hover:bg-gray-800 rounded disabled:opacity-30"
          title="Back"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-gray-400" />
        </button>
        <button
          onClick={() => router.forward()}
          className="p-1.5 hover:bg-gray-800 rounded"
          title="Forward"
        >
          <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
        </button>
      </div>

      <div data-tauri-drag-region className="flex-1 h-full" />

      <div className="flex items-center gap-1">
        {searchExpanded ? (
          <div className="flex items-center gap-2 px-3 py-1 bg-[#141824] border border-blue-500 rounded-md w-72 mr-1">
            <Search className="w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search BossBoard..."
              autoFocus
              onBlur={() => setSearchExpanded(false)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setSearchExpanded(false);
              }}
              className="flex-1 bg-transparent text-sm text-white outline-none"
            />
            <span className="text-[10px] text-gray-500">Esc</span>
          </div>
        ) : (
          <button
            onClick={() => setSearchExpanded(true)}
            className="p-2 hover:bg-gray-800 rounded"
            title="Search (Ctrl+K)"
          >
            <Search className="w-4 h-4 text-gray-400" />
          </button>
        )}

        <button
          onClick={() => window.location.reload()}
          className="p-2 hover:bg-gray-800 rounded"
          title="Refresh (Ctrl+R)"
        >
          <RefreshCw className="w-4 h-4 text-gray-400" />
        </button>

        <button className="p-2 hover:bg-gray-800 rounded relative" title="Notifications">
          <Bell className="w-4 h-4 text-gray-400" />
        </button>

        <button className="p-2 hover:bg-gray-800 rounded" title="Direct Messages">
          <MessageSquare className="w-4 h-4 text-gray-400" />
        </button>

        <button onClick={toggleTheme} className="p-2 hover:bg-gray-800 rounded" title="Toggle theme">
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
              className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center text-white text-sm font-semibold hover:ring-2 hover:ring-blue-400 transition"
              title={user.email}
            >
              {user.initial}
            </button>
            {profileMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setProfileMenuOpen(false)}
                />
                <div className="absolute right-0 top-10 w-56 bg-[#141824] border border-gray-700 rounded-md shadow-xl z-50">
                  <div className="p-3 border-b border-gray-800">
                    <div className="text-xs text-gray-500">Signed in as</div>
                    <div className="text-sm truncate">{user.email}</div>
                  </div>
                  <button
                    onClick={() => {
                      router.push("/desktop/settings");
                      setProfileMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-800"
                  >
                    Settings
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-gray-800"
                  >
                    Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        <div className="w-px h-4 bg-gray-800 mx-1" />
        <button onClick={handleMinimize} className="p-2 hover:bg-gray-800 rounded" title="Minimize">
          <Minus className="w-4 h-4 text-gray-400" />
        </button>
        <button onClick={handleMaximize} className="p-2 hover:bg-gray-800 rounded" title="Maximize">
          <Square className="w-3.5 h-3.5 text-gray-400" />
        </button>
        <button onClick={handleClose} className="p-2 hover:bg-red-600 rounded" title="Close">
          <X className="w-4 h-4 text-gray-400 hover:text-white" />
        </button>
      </div>
    </div>
  );
}
