"use client";

import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { isTauri } from "@/lib/tauri/fs";

const POLL_INTERVAL_MS = 30_000;
const UNHEALTHY_AFTER_MS = 60_000;

export function WorkspaceHealthBanner() {
  const [unhealthy, setUnhealthy] = useState(false);

  useEffect(() => {
    if (!isTauri()) return;

    let lastSuccess = Date.now();
    let cancelled = false;

    async function poll() {
      const path = localStorage.getItem("bb_workspace_path");
      if (!path) return;
      try {
        const ok = await invoke<boolean>("check_workspace_health", { path });
        if (ok) {
          lastSuccess = Date.now();
          if (!cancelled) setUnhealthy(false);
        } else if (Date.now() - lastSuccess > UNHEALTHY_AFTER_MS) {
          if (!cancelled) setUnhealthy(true);
        }
      } catch {
        if (Date.now() - lastSuccess > UNHEALTHY_AFTER_MS) {
          if (!cancelled) setUnhealthy(true);
        }
      }
    }

    poll();
    const id = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  if (!unhealthy) return null;

  return (
    <div className="bg-amber-900/30 border-b border-amber-800 text-amber-200 text-sm py-2 px-4 text-center">
      Workspace folder unavailable. Reconnect the drive or pick a new location in Settings.
    </div>
  );
}
