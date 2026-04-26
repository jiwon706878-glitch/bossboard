"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Settings as SettingsIcon,
  Sparkles,
  Plug,
  Lock,
  Info,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const NAV: Array<{ href: string; label: string; icon: LucideIcon }> = [
  { href: "/desktop/settings", label: "General", icon: SettingsIcon },
  { href: "/desktop/settings/ai-providers", label: "AI Providers", icon: Sparkles },
  { href: "/desktop/settings/integrations", label: "Integrations", icon: Plug },
  { href: "/desktop/settings/data", label: "Data & Privacy", icon: Lock },
  { href: "/desktop/settings/about", label: "About", icon: Info },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full">
      <aside className="w-56 bg-bb-sidebar border-r border-bb-border p-3 space-y-1 shrink-0">
        <h2 className="px-3 py-2 text-xs uppercase tracking-wide text-gray-500">
          Settings
        </h2>
        {NAV.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href ||
            (item.href !== "/desktop/settings" && pathname?.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition ${
                active
                  ? "bg-bb-primary/15 text-bb-primary"
                  : "text-gray-400 hover:text-bb-fg hover:bg-bb-card"
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </aside>
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  );
}
