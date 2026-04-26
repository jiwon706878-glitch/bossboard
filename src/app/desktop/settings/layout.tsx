"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Settings as SettingsIcon,
  Sparkles,
  Plug,
  Lock,
  Info,
  Globe,
  MessageCircle,
  Cloud,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const NAV: Array<{
  href: string;
  label: string;
  icon: LucideIcon;
  primary?: boolean;
}> = [
  { href: "/desktop/settings", label: "General", icon: SettingsIcon },
  { href: "/desktop/settings/ai-providers", label: "AI Providers", icon: Sparkles },
  { href: "/desktop/settings/integrations", label: "Integrations", icon: Plug },
  { href: "/desktop/settings/cloud-sync", label: "Cloud Sync", icon: Cloud },
  { href: "/desktop/settings/usage", label: "Token Usage", icon: Zap },
  { href: "/desktop/settings/translations", label: "Translations", icon: Globe },
  { href: "/desktop/settings/beta-features", label: "Beta Features", icon: Sparkles },
  { href: "/desktop/settings/data", label: "Data & Privacy", icon: Lock },
  {
    href: "/desktop/settings/feedback",
    label: "Send Feedback",
    icon: MessageCircle,
    primary: true,
  },
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
                  : item.primary
                    ? "text-bb-primary hover:bg-bb-card"
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
