"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isTauri } from "@/lib/tauri/fs";
import {
  selectWorkspaceFolder,
  initializeWorkspace,
  isWorkspace,
  getDefaultWorkspacePath,
} from "@/lib/tauri/workspace";

export default function DesktopPage() {
  const router = useRouter();
  const [stage, setStage] = useState<"loading" | "welcome" | "ready">("loading");
  const [defaultPath, setDefaultPath] = useState<string>("");
  const [setupError, setSetupError] = useState<string | null>(null);

  useEffect(() => {
    let checkCount = 0;
    const maxChecks = 20;

    const checkTauri = async () => {
      if (isTauri()) {
        const saved = localStorage.getItem("bb_workspace_path");
        if (saved && (await isWorkspace(saved))) {
          const supabase = createClient();
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (session) {
            router.replace("/desktop/dashboard");
          } else {
            router.replace("/desktop/login");
          }
        } else {
          const def = await getDefaultWorkspacePath();
          setDefaultPath(def);
          setStage("welcome");
        }
        return;
      }

      checkCount++;
      if (checkCount >= maxChecks) {
        window.location.href = "/";
        return;
      }

      setTimeout(checkTauri, 100);
    };

    checkTauri();
  }, [router]);

  async function handleChooseFolder() {
    const selected = await selectWorkspaceFolder();
    if (selected) await setupWorkspace(selected);
  }

  async function handleUseDefault() {
    await setupWorkspace(defaultPath);
  }

  async function setupWorkspace(path: string) {
    try {
      setSetupError(null);
      await initializeWorkspace(path);
      localStorage.setItem("bb_workspace_path", path);
      router.replace("/desktop/login");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setSetupError(`Failed to set up workspace: ${msg}`);
    }
  }

  if (stage === "loading") {
    return (
      <div className="min-h-screen bg-[#0C0F17] text-white flex items-center justify-center">
        <div className="text-gray-400">Loading BossBoard…</div>
      </div>
    );
  }

  if (stage === "welcome") {
    return (
      <div className="min-h-screen bg-[#0C0F17] text-white p-8">
        <div className="max-w-xl mx-auto mt-20">
          <h1 className="text-4xl font-bold mb-4">Welcome to BossBoard</h1>
          <p className="text-gray-400 mb-8">
            Let&apos;s set up your workspace folder. This is where your files will live.
          </p>

          <div className="space-y-3">
            <button
              onClick={handleUseDefault}
              className="w-full p-4 bg-blue-600 hover:bg-blue-500 rounded-md text-left transition"
            >
              <div className="font-semibold">Use default location</div>
              <div className="text-sm text-gray-200 mt-1">{defaultPath}</div>
            </button>

            <button
              onClick={handleChooseFolder}
              className="w-full p-4 border border-gray-700 hover:border-gray-500 rounded-md text-left transition"
            >
              <div className="font-semibold">Choose custom folder</div>
              <div className="text-sm text-gray-400 mt-1">
                Pick where to store your BossBoard files
              </div>
            </button>
          </div>

          {setupError && (
            <div className="mt-4 p-3 bg-red-900/20 border border-red-800 rounded-md text-red-300 text-sm">
              <div>{setupError}</div>
              <button
                onClick={() => setSetupError(null)}
                className="text-xs underline mt-2"
              >
                Dismiss
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
