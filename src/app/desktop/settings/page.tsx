"use client";

import { useEffect, useState } from "react";
import { ApiKeys, getKey, setKey } from "@/lib/tauri/keychain";
import { downloadExport } from "@/lib/export/data-export";

export default function SettingsPage() {
  const [geminiKey, setGeminiKey] = useState("");
  const [anthropicKey, setAnthropicKey] = useState("");
  const [openaiKey, setOpenaiKey] = useState("");
  const [githubToken, setGithubToken] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setGeminiKey((await ApiKeys.google()) ?? "");
        setAnthropicKey((await ApiKeys.anthropic()) ?? "");
        setOpenaiKey((await ApiKeys.openai()) ?? "");
        setGithubToken((await getKey("github_token")) ?? "");
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : String(e));
      }
    })();
  }, []);

  async function saveKeys() {
    try {
      if (geminiKey) await ApiKeys.setGoogle(geminiKey.trim());
      if (anthropicKey) await ApiKeys.setAnthropic(anthropicKey.trim());
      if (openaiKey) await ApiKeys.setOpenai(openaiKey.trim());
      setNotice("AI provider keys saved to OS keychain.");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function saveGithub() {
    try {
      await setKey("github_token", githubToken.trim());
      setNotice("GitHub PAT saved to OS keychain.");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function handleExport() {
    setExporting(true);
    setError(null);
    try {
      await downloadExport();
      setNotice("Data export downloaded.");
    } catch (e: unknown) {
      setError(`Export failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-gray-400 mb-8">Configure BossBoard preferences</p>

        {notice && (
          <div className="mb-6 p-3 bg-bb-primary/10 border border-bb-primary/30 rounded-md text-bb-primary text-sm">
            {notice}
            <button onClick={() => setNotice(null)} className="ml-2 text-xs underline">
              Dismiss
            </button>
          </div>
        )}
        {error && (
          <div className="mb-6 p-3 bg-red-900/20 border border-red-800 rounded-md text-red-300 text-sm">
            {error}
            <button onClick={() => setError(null)} className="ml-2 text-xs underline">
              Dismiss
            </button>
          </div>
        )}

        <div className="space-y-6">
          <section className="p-6 bg-bb-card rounded-md border border-bb-border">
            <h2 className="font-semibold mb-1">AI providers (BYOK)</h2>
            <p className="text-xs text-gray-400 mb-4">
              Keys are stored in your OS keychain (Windows Credential Manager / macOS Keychain).
              Your provider bills you directly — BossBoard charges $0 for AI usage.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">
                  Google Gemini API key (cheapest, recommended)
                </label>
                <input
                  type="password"
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                  placeholder="AIza…"
                  className="w-full p-2 bg-bb-bg border border-bb-border rounded-md text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Anthropic Claude API key</label>
                <input
                  type="password"
                  value={anthropicKey}
                  onChange={(e) => setAnthropicKey(e.target.value)}
                  placeholder="sk-ant-…"
                  className="w-full p-2 bg-bb-bg border border-bb-border rounded-md text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">OpenAI API key</label>
                <input
                  type="password"
                  value={openaiKey}
                  onChange={(e) => setOpenaiKey(e.target.value)}
                  placeholder="sk-…"
                  className="w-full p-2 bg-bb-bg border border-bb-border rounded-md text-sm font-mono"
                />
              </div>
              <button
                onClick={saveKeys}
                className="px-3 py-1.5 bg-bb-primary hover:bg-bb-primary-hover rounded-md text-sm"
              >
                Save AI keys
              </button>
            </div>
          </section>

          <section className="p-6 bg-bb-card rounded-md border border-bb-border">
            <h2 className="font-semibold mb-1">Integrations</h2>
            <p className="text-xs text-gray-400 mb-4">
              v3.0 stores integration tokens in the OS keychain. Active tool-use by agents lands in
              v3.1 with the full MCP protocol.
            </p>

            <div className="space-y-4">
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
            </div>
          </section>

          <section className="p-6 bg-bb-card rounded-md border border-bb-border">
            <h2 className="font-semibold mb-2">Data &amp; Privacy</h2>
            <p className="text-xs text-gray-400 mb-4">
              Download everything BossBoard has about you. The workspace folder exports as plain
              markdown — usable in any editor.
            </p>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="px-3 py-1.5 bg-bb-primary hover:bg-bb-primary-hover rounded-md text-sm disabled:opacity-50"
            >
              {exporting ? "Preparing…" : "Export all data (.zip)"}
            </button>

            <div className="mt-6 pt-4 border-t border-red-900/40">
              <h3 className="font-medium text-red-400 mb-1">Delete account</h3>
              <p className="text-xs text-gray-400 mb-3">
                Permanently delete your BossBoard cloud account. Your local workspace folder stays
                on your PC. Self-service deletion ships in v3.1.
              </p>
              <button
                onClick={() =>
                  setNotice(
                    "Email jay@mybossboard.com from your account email to delete your cloud account.",
                  )
                }
                className="px-3 py-1.5 border border-red-900 text-red-400 hover:bg-red-900/20 rounded-md text-sm"
              >
                Delete account
              </button>
            </div>
          </section>

          <section className="p-6 bg-bb-card rounded-md border border-bb-border">
            <h2 className="font-semibold mb-1">Profile picture</h2>
            <p className="text-xs text-gray-400">
              v3.0 uses a local initial-based avatar. Cloud avatar upload is a{" "}
              <span className="text-bb-primary">Pro plan</span> feature and ships with the Pro
              launch.
            </p>
          </section>

          <section className="p-6 bg-bb-card rounded-md border border-bb-border">
            <h2 className="font-semibold mb-2">Roadmap to launch</h2>
            <ul className="text-sm text-gray-400 space-y-1 list-disc list-inside">
              <li>Workspace folder relocation (post-launch hotfix)</li>
              <li>Notifications via Supabase Realtime (post-launch hotfix)</li>
              <li>Board + Calendar (post-launch hotfix)</li>
              <li>Cloud avatar upload (Pro launch)</li>
              <li>OAuth-based GitHub + Google Drive MCP (v3.1)</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
