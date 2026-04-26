"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Mail, ArrowRight } from "lucide-react";
import { getKey, setKey } from "@/lib/tauri/keychain";

export default function IntegrationsPage() {
  const [githubToken, setGithubToken] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getKey("github_token")
      .then((v) => setGithubToken(v ?? ""))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  async function saveGithub() {
    try {
      await setKey("github_token", githubToken.trim());
      setNotice("GitHub PAT saved to OS keychain.");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-2xl font-bold mb-1">Integrations</h1>
      <p className="text-sm text-gray-400 mb-6">
        External tools your agents can read from. Active tool-use lands in v3.1 with the
        full MCP protocol.
      </p>

      {notice && (
        <div className="mb-4 p-3 bg-bb-primary/10 border border-bb-primary/30 rounded-md text-bb-primary text-sm">
          {notice}
          <button onClick={() => setNotice(null)} className="ml-2 text-xs underline">
            Dismiss
          </button>
        </div>
      )}
      {error && (
        <div className="mb-4 p-3 bg-red-900/20 border border-red-800 rounded-md text-red-300 text-sm">
          {error}
          <button onClick={() => setError(null)} className="ml-2 text-xs underline">
            Dismiss
          </button>
        </div>
      )}

      <Link
        href="/desktop/settings/integrations/email"
        className="group mb-4 flex items-center gap-3 p-4 bg-bb-card rounded-md border border-bb-border hover:border-bb-primary transition"
      >
        <div className="size-10 rounded-md bg-bb-primary/10 grid place-items-center text-bb-primary shrink-0">
          <Mail className="size-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm flex items-center gap-2">
            Email Integration
            <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
              Pro+ · Coming v3.1
            </span>
          </div>
          <div className="text-xs text-gray-400 mt-0.5">
            Connect Gmail / Outlook / IMAP — agents read, search, and draft replies.
          </div>
        </div>
        <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-bb-primary group-hover:translate-x-1 transition-all" />
      </Link>

      <section className="p-6 bg-bb-card rounded-md border border-bb-border space-y-4">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm font-medium">GitHub</label>
            <span
              className={`text-[11px] px-2 py-0.5 rounded ${
                githubToken
                  ? "bg-bb-primary/20 text-bb-primary"
                  : "bg-bb-bg text-gray-500"
              }`}
            >
              {githubToken ? "connected" : "not connected"}
            </span>
          </div>
          <input
            type="password"
            value={githubToken}
            onChange={(e) => setGithubToken(e.target.value)}
            placeholder="github_pat_…"
            className="w-full p-2 bg-bb-bg border border-bb-border rounded-md text-sm font-mono"
          />
          <div className="text-[11px] text-gray-500 mt-1">
            Create a classic PAT at github.com/settings/tokens with{" "}
            <code>repo</code> + <code>read:user</code> scopes. OAuth flow comes in v3.1.
          </div>
          <button
            onClick={saveGithub}
            className="mt-2 px-3 py-1.5 bg-bb-primary hover:bg-bb-primary-hover rounded-md text-sm"
          >
            Save GitHub PAT
          </button>
        </div>

        <div className="pt-4 border-t border-bb-border">
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm font-medium">Google Drive</label>
            <span className="text-[11px] px-2 py-0.5 rounded bg-bb-bg text-gray-500">
              coming v3.1
            </span>
          </div>
          <p className="text-xs text-gray-400">
            Connect Drive to give agents read access to selected folders. Setup UI ships
            alongside the OAuth/MCP work in v3.1.
          </p>
        </div>
      </section>
    </div>
  );
}
