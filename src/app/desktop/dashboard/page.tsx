"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

export default function DesktopDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [workspacePath, setWorkspacePath] = useState<string>("");

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/desktop/login");
        return;
      }
      setUser(session.user);
      const path = localStorage.getItem("bb_workspace_path") || "";
      setWorkspacePath(path);
    })();
  }, [router]);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/desktop/login");
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#0C0F17] text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">BossBoard</h1>
          <button onClick={handleSignOut} className="text-sm text-gray-400 hover:text-white">
            Sign out
          </button>
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-[#141824] rounded-md border border-gray-800">
            <div className="text-xs text-gray-500 uppercase">Signed in as</div>
            <div className="text-lg mt-1">{user.email}</div>
          </div>

          <div className="p-4 bg-[#141824] rounded-md border border-gray-800">
            <div className="text-xs text-gray-500 uppercase">Workspace</div>
            <div className="text-sm text-gray-300 mt-1 font-mono">{workspacePath}</div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-8">
            <button
              onClick={() => router.push("/desktop/library")}
              className="p-6 bg-[#141824] rounded-md border border-gray-800 hover:border-blue-500 transition text-left"
            >
              <div className="text-xl font-semibold">Library</div>
              <div className="text-sm text-gray-400 mt-1">Wiki pages and manuals</div>
            </button>
            <button
              disabled
              className="p-6 bg-[#141824] rounded-md border border-gray-800 opacity-50 text-left cursor-not-allowed"
            >
              <div className="text-xl font-semibold">Agents</div>
              <div className="text-sm text-gray-400 mt-1">Coming in Week 3</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
