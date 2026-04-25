"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Library,
  LayoutGrid,
  MessageSquare,
  Calendar,
  Users,
  Bot,
  Settings,
  LogOut,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const NAV_ITEMS = [
  { href: "/desktop/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/desktop/library", label: "Library", icon: Library },
  { href: "/desktop/board", label: "Board", icon: LayoutGrid, disabled: true },
  { href: "/desktop/dm", label: "DM", icon: MessageSquare, disabled: true },
  { href: "/desktop/calendar", label: "Calendar", icon: Calendar, disabled: true },
  { href: "/desktop/meetings", label: "Meetings", icon: Users, disabled: true },
  { href: "/desktop/agents", label: "Agents", icon: Bot, disabled: true },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/desktop/login");
  }

  return (
    <aside className="w-56 bg-[#0A0D14] border-r border-gray-800 flex flex-col">
      <div className="p-4 border-b border-gray-800">
        <div className="font-bold text-white">BossBoard</div>
        <div className="text-xs text-gray-500 mt-0.5">v3.0 beta</div>
      </div>

      <nav className="flex-1 p-2 space-y-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = pathname?.startsWith(item.href);

          if (item.disabled) {
            return (
              <div
                key={item.href}
                className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-gray-600 cursor-not-allowed"
                title="Coming soon"
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
                <span className="ml-auto text-[10px] bg-gray-800 px-1.5 py-0.5 rounded">soon</span>
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition ${
                active
                  ? "bg-blue-600/20 text-blue-400 border-l-2 border-blue-500"
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-2 border-t border-gray-800">
        <Link
          href="/desktop/settings"
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-gray-400 hover:text-white hover:bg-gray-800"
        >
          <Settings className="w-4 h-4" />
          <span>Settings</span>
        </Link>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-gray-400 hover:text-red-400 hover:bg-gray-800"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}
