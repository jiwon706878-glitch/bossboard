"use client";

import { useEffect, useState } from "react";
import { isTauri } from "@/lib/tauri/fs";
import {
  selectWorkspaceFolder,
  initializeWorkspace,
  isWorkspace,
  getDefaultWorkspacePath,
} from "@/lib/tauri/workspace";

export default function DesktopPage() {
  const [workspacePath, setWorkspacePath] = useState<string | null>(null);
  const [step, setStep] = useState<"loading" | "welcome" | "select" | "ready">("loading");
  const [defaultPath, setDefaultPath] = useState<string>("");

  useEffect(() => {
    if (!isTauri()) {
      setStep("ready");
      return;
    }

    (async () => {
      const saved = localStorage.getItem("bb_workspace_path");
      if (saved && (await isWorkspace(saved))) {
        setWorkspacePath(saved);
        setStep("ready");
      } else {
        const def = await getDefaultWorkspacePath();
        setDefaultPath(def);
        setStep("welcome");
      }
    })();
  }, []);

  async function handleChooseFolder() {
    const selected = await selectWorkspaceFolder();
    if (selected) {
      await setupWorkspace(selected);
    }
  }

  async function handleUseDefault() {
    await setupWorkspace(defaultPath);
  }

  async function setupWorkspace(path: string) {
    try {
      await initializeWorkspace(path);
      localStorage.setItem("bb_workspace_path", path);
      setWorkspacePath(path);
      setStep("ready");
    } catch (e) {
      console.error("Failed to initialize workspace:", e);
      alert(`Error: ${e}`);
    }
  }

  if (step === "loading") {
    return <div className="p-8 text-white">Loading…</div>;
  }

  if (step === "welcome") {
    return (
      <div className="min-h-screen bg-[#0C0F17] text-white p-8">
        <div className="max-w-xl mx-auto mt-20">
          <h1 className="text-4xl font-bold mb-4">Welcome to BossBoard</h1>
          <p className="text-gray-400 mb-8">
            Your AI agents need a workspace. Let&apos;s set up the folder where your files will live.
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

          <p className="text-xs text-gray-500 mt-8">
            BossBoard will create subfolders: Library, agents, shared, private
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0C0F17] text-white p-8">
      <h1 className="text-3xl font-bold mb-4">BossBoard</h1>
      <p className="text-gray-400 mb-4">Workspace: {workspacePath}</p>
      <p className="text-green-400">Ready! Next: Dashboard will be built in Week 2.</p>
    </div>
  );
}
