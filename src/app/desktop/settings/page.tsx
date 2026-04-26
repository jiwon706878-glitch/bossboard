"use client";

import Link from "next/link";
import { Sparkles, Plug, Lock, Info, ArrowRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const QUICK_LINKS: Array<{
  href: string;
  label: string;
  icon: LucideIcon;
  hint: string;
}> = [
  {
    href: "/desktop/settings/ai-providers",
    label: "AI Providers",
    icon: Sparkles,
    hint: "Add Google, Anthropic, OpenAI, xAI, or local model keys.",
  },
  {
    href: "/desktop/settings/integrations",
    label: "Integrations",
    icon: Plug,
    hint: "Connect GitHub and (soon) Google Drive for agent tool-use.",
  },
  {
    href: "/desktop/settings/data",
    label: "Data & Privacy",
    icon: Lock,
    hint: "Export everything, delete your cloud account.",
  },
  {
    href: "/desktop/settings/about",
    label: "About",
    icon: Info,
    hint: "Beta v0.1, build info, roadmap.",
  },
];

export default function SettingsGeneralPage() {
  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-2xl font-bold mb-1">Settings</h1>
      <p className="text-sm text-gray-400 mb-6">
        Configure BossBoard. Pick a section from the left or use the quick links below.
      </p>

      <div className="grid gap-3">
        {QUICK_LINKS.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className="group flex items-center gap-4 p-4 bg-bb-card rounded-md border border-bb-border hover:border-bb-primary transition"
            >
              <div className="w-10 h-10 grid place-items-center rounded-md bg-bb-primary/10 text-bb-primary">
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{link.label}</div>
                <div className="text-xs text-gray-400 mt-0.5">{link.hint}</div>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-bb-primary group-hover:translate-x-1 transition-all" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
