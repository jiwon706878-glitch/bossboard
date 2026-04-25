"use client";

import { useRef, useState } from "react";
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
  const [oauthInProgress, setOauthInProgress] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const oauthCancelRef = useRef<{ cancelled: boolean }>({ cancelled: false });

  const supabase = createClient();

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (!rememberMe) {
        sessionStorage.setItem("bb_session_only", "true");
      } else {
        sessionStorage.removeItem("bb_session_only");
      }
      router.replace("/desktop/dashboard");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function handleOAuth(provider: "google" | "github") {
    if (provider === "github") {
      setError("GitHub login is not yet configured. Use Google or email/password.");
      return;
    }

    setLoading(true);
    setOauthInProgress(true);
    setError(null);
    oauthCancelRef.current = { cancelled: false };

    try {
      const redirectTo = `${window.location.origin}/auth/callback-desktop`;
      if (isTauri()) {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider,
          options: { redirectTo, skipBrowserRedirect: true },
        });
        if (error) throw error;
        if (data?.url) {
          await openExternal(data.url);
          pollForSession(oauthCancelRef.current);
        }
      } else {
        await supabase.auth.signInWithOAuth({ provider, options: { redirectTo } });
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
      setLoading(false);
      setOauthInProgress(false);
    }
  }

  async function pollForSession(cancelRef: { cancelled: boolean }) {
    for (let i = 0; i < 60; i++) {
      if (cancelRef.cancelled) {
        setLoading(false);
        setOauthInProgress(false);
        return;
      }
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
    setOauthInProgress(false);
  }

  function cancelOAuth() {
    oauthCancelRef.current.cancelled = true;
    setLoading(false);
    setOauthInProgress(false);
    setError(null);
  }

  async function handleCreateAccount() {
    if (isTauri()) {
      await openExternal("https://mybossboard.com/signup");
    } else {
      router.push("/signup");
    }
  }

  return (
    <div className="min-h-screen bg-bb-bg text-bb-fg flex items-center justify-center p-4">
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
            className="w-full p-3 bg-[#24292e] text-white rounded-md font-medium hover:bg-[#333] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            Continue with GitHub
            <span className="text-xs text-gray-400">(coming soon)</span>
          </button>
        </div>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-700" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-bb-bg px-2 text-gray-500">or continue with email</span>
          </div>
        </div>

        <form onSubmit={handleEmailLogin} className="space-y-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full p-3 bg-bb-card border border-gray-700 rounded-md text-white"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full p-3 bg-bb-card border border-gray-700 rounded-md text-white"
          />
          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-gray-700 bg-bb-card"
              />
              <span className="text-gray-300">Remember me</span>
            </label>
            <button
              type="button"
              onClick={() =>
                setError(
                  "Password reset coming soon. Contact jay@mybossboard.com for help.",
                )
              }
              className="text-bb-primary hover:underline"
            >
              Forgot password?
            </button>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full p-3 bg-bb-primary hover:bg-bb-primary-hover rounded-md font-medium disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        {oauthInProgress && (
          <div className="mt-4 p-3 bg-blue-900/20 border border-blue-800 rounded-md text-sm">
            <div className="text-blue-300">Waiting for login in browser...</div>
            <div className="text-xs text-gray-400 mt-1">
              Complete the login in the browser window that opened.
            </div>
            <button
              onClick={cancelOAuth}
              className="text-xs text-gray-400 hover:text-white mt-2 underline"
            >
              Cancel and try a different method
            </button>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-red-900/20 border border-red-800 rounded-md text-red-300 text-sm">
            {error}
          </div>
        )}

        <div className="mt-6 text-center text-sm text-gray-400">
          New to BossBoard?{" "}
          <button onClick={handleCreateAccount} className="text-bb-primary hover:underline">
            Create account
          </button>
        </div>
      </div>
    </div>
  );
}
