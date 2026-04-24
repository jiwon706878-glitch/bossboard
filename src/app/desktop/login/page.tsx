"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isTauri } from "@/lib/tauri/fs";
import { open as openExternal } from "@tauri-apps/plugin-shell";

export default function DesktopLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      router.replace("/desktop/dashboard");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function handleOAuth(provider: "google" | "github") {
    setLoading(true);
    try {
      const redirectTo = `${window.location.origin}/auth/callback`;
      if (isTauri()) {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider,
          options: { redirectTo, skipBrowserRedirect: true },
        });
        if (error) throw error;
        if (data?.url) {
          await openExternal(data.url);
          pollForSession();
        }
      } else {
        await supabase.auth.signInWithOAuth({ provider, options: { redirectTo } });
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
      setLoading(false);
    }
  }

  async function pollForSession() {
    for (let i = 0; i < 60; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        router.replace("/desktop/dashboard");
        return;
      }
    }
    setError("Login timed out. Please try again.");
    setLoading(false);
  }

  async function handleCreateAccount() {
    if (isTauri()) {
      await openExternal("https://mybossboard.com/signup");
    } else {
      router.push("/signup");
    }
  }

  return (
    <div className="min-h-screen bg-[#0C0F17] text-white flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold">BossBoard</h1>
          <p className="text-sm text-gray-400 mt-1">Local-first AI agent workspace</p>
        </div>

        <div className="space-y-3 mb-6">
          <button
            onClick={() => handleOAuth("google")}
            disabled={loading}
            className="w-full p-3 bg-white text-black rounded-md font-medium hover:bg-gray-100 disabled:opacity-50"
          >
            Continue with Google
          </button>
          <button
            onClick={() => handleOAuth("github")}
            disabled={loading}
            className="w-full p-3 bg-[#24292e] text-white rounded-md font-medium hover:bg-[#333] disabled:opacity-50"
          >
            Continue with GitHub
          </button>
        </div>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-700" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-[#0C0F17] px-2 text-gray-500">or continue with email</span>
          </div>
        </div>

        <form onSubmit={handleEmailLogin} className="space-y-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full p-3 bg-[#141824] border border-gray-700 rounded-md text-white"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full p-3 bg-[#141824] border border-gray-700 rounded-md text-white"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full p-3 bg-blue-600 hover:bg-blue-500 rounded-md font-medium disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        {error && (
          <div className="mt-4 p-3 bg-red-900/20 border border-red-800 rounded-md text-red-300 text-sm">
            {error}
          </div>
        )}

        <div className="mt-6 text-center text-sm text-gray-400">
          New to BossBoard?{" "}
          <button onClick={handleCreateAccount} className="text-blue-400 hover:underline">
            Create account
          </button>
        </div>
      </div>
    </div>
  );
}
