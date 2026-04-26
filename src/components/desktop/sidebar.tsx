"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { MOTION } from "@/lib/motion/tokens";
import {
  LayoutDashboard,
  Library,
  LayoutGrid,
  MessageSquare,
  Calendar,
  Users,
  Bot,
  Settings,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  disabled?: boolean;
  subItems?: { href: string; label: string }[];
  emit?: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/desktop/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/desktop/library", label: "Library", icon: Library },
  { href: "/desktop/agents", label: "Agents", icon: Bot },
  { href: "/desktop/dm", label: "DM", icon: MessageSquare, emit: "bb-dm-toggle" },
  { href: "/desktop/meetings", label: "Meetings", icon: Users },
  { href: "/desktop/calendar", label: "Calendar", icon: Calendar },
  { href: "/desktop/board", label: "Board", icon: LayoutGrid, disabled: true },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    setCollapsed(localStorage.getItem("bb_sidebar_collapsed") === "true");
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ collapsed: boolean }>).detail;
      if (detail) setCollapsed(detail.collapsed);
    };
    window.addEventListener("bb-sidebar-toggle", handler);
    return () => window.removeEventListener("bb-sidebar-toggle", handler);
  }, []);

  function toggleExpand(href: string) {
    setExpandedItems((s) => {
      const n = new Set(s);
      if (n.has(href)) n.delete(href);
      else n.add(href);
      return n;
    });
  }

  return (
    <motion.aside
      animate={{ width: collapsed ? 56 : 224 }}
      transition={MOTION.spring.default}
      className="bg-bb-sidebar border-r border-bb-border flex flex-col overflow-hidden"
    >
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = !item.emit && pathname?.startsWith(item.href);
          const expanded = expandedItems.has(item.href);
          const hasSubs = item.subItems && item.subItems.length > 0;

          if (item.disabled) {
            return (
              <div
                key={item.href}
                className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-gray-600 cursor-not-allowed"
                title={collapsed ? `${item.label} (soon)` : undefined}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {!collapsed && (
                  <>
                    <span>{item.label}</span>
                    <span className="ml-auto text-[10px] bg-bb-card px-1.5 py-0.5 rounded">
                      soon
                    </span>
                  </>
                )}
              </div>
            );
          }

          const itemClass = `relative flex items-center gap-3 px-3 py-2 rounded-md text-sm transition flex-1 ${
            active
              ? "text-bb-primary"
              : "text-gray-400 hover:text-bb-fg hover:bg-bb-card"
          }`;

          const indicator = active ? (
            <motion.div
              layoutId="sidebar-active"
              transition={MOTION.spring.default}
              className="absolute inset-0 bg-bb-primary/20 rounded-md border-l-2 border-bb-primary"
            />
          ) : null;

          return (
            <div key={item.href}>
              <div className="flex items-center">
                {item.emit ? (
                  <button
                    onClick={() => window.dispatchEvent(new Event(item.emit!))}
                    className={itemClass}
                    title={collapsed ? item.label : undefined}
                  >
                    {indicator}
                    <Icon className="w-4 h-4 flex-shrink-0 relative z-10" />
                    {!collapsed && <span className="relative z-10">{item.label}</span>}
                  </button>
                ) : (
                  <Link
                    href={item.href}
                    className={itemClass}
                    title={collapsed ? item.label : undefined}
                  >
                    {indicator}
                    <Icon className="w-4 h-4 flex-shrink-0 relative z-10" />
                    {!collapsed && <span className="relative z-10">{item.label}</span>}
                  </Link>
                )}
                {!collapsed && hasSubs && (
                  <button
                    onClick={() => toggleExpand(item.href)}
                    className="p-1 hover:bg-bb-card rounded mr-1"
                    title={expanded ? "Collapse" : "Expand"}
                  >
                    {expanded ? (
                      <ChevronDown className="w-3 h-3" />
                    ) : (
                      <ChevronRight className="w-3 h-3" />
                    )}
                  </button>
                )}
              </div>

              {!collapsed && hasSubs && expanded && (
                <div className="ml-6 mt-1 space-y-0.5 overflow-hidden animate-slideDown">
                  {item.subItems?.map((sub) => (
                    <Link
                      key={sub.href}
                      href={sub.href}
                      className="block px-3 py-1 text-xs text-gray-400 hover:text-bb-fg hover:bg-bb-card rounded"
                    >
                      {sub.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="p-2 border-t border-bb-border">
        <Link
          href="/desktop/settings"
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-gray-400 hover:text-bb-fg hover:bg-bb-card"
          title={collapsed ? "Settings" : undefined}
        >
          <Settings className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Settings</span>}
        </Link>
      </div>
    </motion.aside>
  );
}
