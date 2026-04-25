"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Minus, Square, X, Search, Sun, Moon } from "lucide-react";
import { isTauri } from "@/lib/tauri/fs";

export function Titlebar() {
  const router = useRouter();
  const [canGoBack, setCanGoBack] = useState(false);
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const updateNav = () => {
      setCanGoBack(window.history.length > 1);
    };
    updateNav();
    window.addEventListener("popstate", updateNav);
    return () => window.removeEventListener("popstate", updateNav);
  }, []);

  async function handleMinimize() {
    if (!isTauri()) return;
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    await getCurrentWindow().minimize();
  }

  async function handleMaximize() {
    if (!isTauri()) return;
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    await getCurrentWindow().toggleMaximize();
  }

  async function handleClose() {
    if (!isTauri()) return;
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    await getCurrentWindow().close();
  }

  function handleBack() {
    router.back();
  }

  function handleForward() {
    router.forward();
  }

  function toggleTheme() {
    setIsDark(!isDark);
    document.documentElement.classList.toggle("dark");
  }

  return (
    <div
      data-tauri-drag-region
      className="h-10 bg-[#0C0F17] border-b border-gray-800 flex items-center justify-between px-2 select-none"
    >
      <div className="flex items-center gap-1">
        <button
          onClick={handleBack}
          disabled={!canGoBack}
          className="p-1.5 hover:bg-gray-800 rounded disabled:opacity-30 disabled:cursor-not-allowed"
          title="Back"
        >
          <ArrowLeft className="w-4 h-4 text-gray-400" />
        </button>
        <button
          onClick={handleForward}
          className="p-1.5 hover:bg-gray-800 rounded"
          title="Forward"
        >
          <ArrowRight className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      <div data-tauri-drag-region className="flex-1 flex justify-center items-center mx-4">
        <div className="flex items-center gap-2 px-3 py-1 bg-[#141824] border border-gray-800 rounded-md text-xs text-gray-500 w-96 cursor-text">
          <Search className="w-3.5 h-3.5" />
          <span>Search BossBoard...</span>
          <span className="ml-auto text-[10px] text-gray-600">Ctrl+K</span>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button onClick={toggleTheme} className="p-1.5 hover:bg-gray-800 rounded" title="Toggle theme">
          {isDark ? (
            <Moon className="w-4 h-4 text-gray-400" />
          ) : (
            <Sun className="w-4 h-4 text-gray-400" />
          )}
        </button>
        <div className="w-px h-4 bg-gray-800 mx-1" />
        <button onClick={handleMinimize} className="p-1.5 hover:bg-gray-800 rounded" title="Minimize">
          <Minus className="w-4 h-4 text-gray-400" />
        </button>
        <button onClick={handleMaximize} className="p-1.5 hover:bg-gray-800 rounded" title="Maximize">
          <Square className="w-3.5 h-3.5 text-gray-400" />
        </button>
        <button onClick={handleClose} className="p-1.5 hover:bg-red-600 rounded" title="Close">
          <X className="w-4 h-4 text-gray-400 hover:text-white" />
        </button>
      </div>
    </div>
  );
}
