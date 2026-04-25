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

  if (!user) return null;

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-gray-400 mb-8">Welcome back, {user.email}</p>

        <div className="space-y-4">
          <div className="p-4 bg-[#141824] rounded-md border border-gray-800">
            <div className="text-xs text-gray-500 uppercase">Workspace</div>
            <div className="text-sm text-gray-300 mt-1 font-mono">{workspacePath}</div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-8">
            <div className="p-6 bg-[#141824] rounded-md border border-gray-800">
              <div className="text-xs text-gray-500 uppercase">Agents</div>
              <div className="text-3xl font-bold mt-2">0</div>
              <div className="text-xs text-gray-500 mt-1">Coming in Week 3</div>
            </div>
            <div className="p-6 bg-[#141824] rounded-md border border-gray-800">
              <div className="text-xs text-gray-500 uppercase">Library Pages</div>
              <div className="text-3xl font-bold mt-2">—</div>
              <div className="text-xs text-gray-500 mt-1">Check Library</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
