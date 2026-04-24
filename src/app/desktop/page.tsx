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

  useEffect(() => {
    (async () => {
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
      } else {
        window.location.href = "/";
      }
    })();
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
      await initializeWorkspace(path);
      localStorage.setItem("bb_workspace_path", path);
      router.replace("/desktop/login");
    } catch (e) {
      alert(`Error: ${e}`);
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
        </div>
      </div>
    );
  }

  return null;
}
