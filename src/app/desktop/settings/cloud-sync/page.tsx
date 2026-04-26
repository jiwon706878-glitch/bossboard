"use client";

import { useEffect, useState } from "react";
import {
  Cloud,
  Lock,
  Library,
  LayoutGrid,
  Calendar,
  MessageCircle,
  Shield,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { Switch } from "@/components/ui/switch";
import { usePlan } from "@/lib/auth/use-plan";
import { isFeatureAvailable } from "@/lib/plan-gate";

interface SyncSettings {
  library: boolean;
  board: boolean;
  calendar: boolean;
  dm: boolean;
}

const STORAGE_KEY = "bb_cloud_sync_v6";

const DEFAULT_SETTINGS: SyncSettings = {
  library: false, // v3.2+ feature
  board: true, // small data, free included
  calendar: true, // small data, free included
  dm: false, // Starter+ only
};

interface ToggleRow {
  key: keyof SyncSettings;
  icon: LucideIcon;
  label: string;
  description: string;
  /** Marketing-facing requirement label. */
  requires: string;
  /** True iff the user's plan allows the toggle to be flipped on. */
  allowed: boolean;
}

export default function CloudSyncPage() {
  const { plan } = usePlan();
  const [settings, setSettings] = useState<SyncSettings>(DEFAULT_SETTINGS);
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<SyncSettings>;
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  const dmAllowed = isFeatureAvailable("dm_cloud_sync", plan);
  const libraryAllowed = isFeatureAvailable("library_cloud_sync", plan);

  function persist(next: SyncSettings) {
    setSettings(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }

  function handleToggle(key: keyof SyncSettings, value: boolean) {
    setError(null);
    if (key === "dm" && value && !dmAllowed) {
      setError("DM cloud sync requires the Starter plan or higher.");
      return;
    }
    if (key === "library" && value) {
      setError(
        "Library cloud sync ships in v3.2 — Pro+ subscribers get early access on launch.",
      );
      return;
    }
    persist({ ...settings, [key]: value });
  }

  const rows: ToggleRow[] = [
    {
      key: "library",
      icon: Library,
      label: "Library",
      description: "Sync markdown files across devices.",
      requires: "Coming v3.2 (Pro+)",
      allowed: libraryAllowed,
    },
    {
      key: "board",
      icon: LayoutGrid,
      label: "Board",
      description: "Team posts and announcements.",
      requires: "All plans",
      allowed: true,
    },
    {
      key: "calendar",
      icon: Calendar,
      label: "Calendar",
      description: "Events across devices.",
      requires: "All plans",
      allowed: true,
    },
    {
      key: "dm",
      icon: MessageCircle,
      label: "Direct Messages",
      description: "Sync DM conversations across devices.",
      requires: "Starter+ plan",
      allowed: dmAllowed,
    },
  ];

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center gap-2 mb-1">
        <Cloud className="size-5 text-bb-primary" />
        <h1 className="text-2xl font-bold">Cloud Sync</h1>
      </div>
      <p className="text-sm text-gray-400 mb-6">
        Choose what syncs to BossBoard cloud. Library files always remain local;
        only metadata syncs.
      </p>

      <section className="mb-5 rounded-lg border-l-4 border-blue-500 bg-blue-900/15 p-4 text-sm">
        <div className="flex items-start gap-2">
          <Shield className="size-4 text-blue-400 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">Privacy by default</p>
            <p className="text-gray-400 mt-1">
              BossBoard never reads your synced data. Encrypted in transit
              (TLS 1.3) and at rest (AES-256). Disable any time — local copies
              always remain.
            </p>
          </div>
        </div>
      </section>

      {error && (
        <div className="mb-4 p-3 bg-red-900/20 border border-red-800 rounded-md text-red-300 text-sm">
          {error}
          <button onClick={() => setError(null)} className="ml-2 text-xs underline">
            Dismiss
          </button>
        </div>
      )}

      <div className="space-y-3">
        {rows.map((row) => {
          const Icon = row.icon;
          const checked = hydrated ? settings[row.key] : false;
          return (
            <motion.div
              key={row.key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-lg border border-bb-border bg-bb-card p-4 flex items-center gap-3"
            >
              <Icon className="size-5 text-gray-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium flex items-center gap-2">
                  {row.label}
                  {!row.allowed && (
                    <Lock className="size-3.5 text-amber-400" />
                  )}
                </div>
                <div className="text-xs text-gray-400">{row.description}</div>
                <div
                  className={`text-[11px] mt-0.5 ${
                    row.allowed ? "text-gray-500" : "text-amber-400"
                  }`}
                >
                  {row.requires}
                </div>
              </div>
              <Switch
                checked={checked}
                disabled={!hydrated || !row.allowed}
                onCheckedChange={(v) => handleToggle(row.key, v)}
              />
            </motion.div>
          );
        })}
      </div>

      <p className="text-xs text-gray-500 mt-6">
        Toggle state is persisted locally per-device. The actual sync workers
        live in v3.1 (DM) and v3.2 (Library).
      </p>
    </div>
  );
}
