"use client";

import { useEffect, useState } from "react";

export default function SettingsPage() {
  const [geminiKey, setGeminiKey] = useState("");
  const [anthropicKey, setAnthropicKey] = useState("");
  const [githubToken, setGithubToken] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    setGeminiKey(localStorage.getItem("bb_api_key_google") || "");
    setAnthropicKey(localStorage.getItem("bb_api_key_anthropic") || "");
    setGithubToken(localStorage.getItem("bb_github_token") || "");
  }, []);

  function saveKeys() {
    localStorage.setItem("bb_api_key_google", geminiKey.trim());
    localStorage.setItem("bb_api_key_anthropic", anthropicKey.trim());
    setNotice("AI provider keys saved locally.");
  }

  function saveGithub() {
    localStorage.setItem("bb_github_token", githubToken.trim());
    setNotice("GitHub PAT saved locally.");
  }

  return (
    <div className="p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-gray-400 mb-8">Configure BossBoard preferences</p>

        {notice && (
          <div className="mb-6 p-3 bg-bb-primary/10 border border-bb-primary/30 rounded-md text-bb-primary text-sm">
            {notice}
            <button
              onClick={() => setNotice(null)}
              className="ml-2 text-xs underline"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="space-y-6">
          <section className="p-6 bg-bb-card rounded-md border border-bb-border">
            <h2 className="font-semibold mb-1">AI providers (BYOK)</h2>
            <p className="text-xs text-gray-400 mb-4">
              Keys are stored locally. Your provider bills you directly — BossBoard charges $0
              for AI usage. v3.0 stores keys in localStorage; OS Keychain integration is
              tracked for a post-launch hotfix.
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
                <label className="block text-xs text-gray-400 mb-1">
                  Anthropic Claude API key
                </label>
                <input
                  type="password"
                  value={anthropicKey}
                  onChange={(e) => setAnthropicKey(e.target.value)}
                  placeholder="sk-ant-…"
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
              v3.0 stores integration tokens. Active tool-use by agents lands in v3.1 with the
              full MCP protocol.
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
                  Create a classic Personal Access Token at github.com/settings/tokens with{" "}
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
            <h2 className="font-semibold mb-1">Profile picture</h2>
            <p className="text-xs text-gray-400">
              v3.0 uses a local initial-based avatar (cobalt gradient). Cloud avatar upload is a{" "}
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
