"use client";

import { useEffect, useState } from "react";

export default function SettingsPage() {
  const [geminiKey, setGeminiKey] = useState("");
  const [anthropicKey, setAnthropicKey] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    setGeminiKey(localStorage.getItem("bb_api_key_google") || "");
    setAnthropicKey(localStorage.getItem("bb_api_key_anthropic") || "");
  }, []);

  function saveKeys() {
    localStorage.setItem("bb_api_key_google", geminiKey.trim());
    localStorage.setItem("bb_api_key_anthropic", anthropicKey.trim());
    setNotice("API keys saved locally.");
  }

  return (
    <div className="p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-gray-400 mb-8">Configure BossBoard preferences</p>

        <div className="space-y-6">
          <section className="p-6 bg-bb-card rounded-md border border-bb-border">
            <h2 className="font-semibold mb-1">AI providers (BYOK)</h2>
            <p className="text-xs text-gray-400 mb-4">
              Keys are stored locally. Your provider bills you directly — BossBoard charges $0
              for AI usage. v3.0 stores keys in localStorage; OS Keychain integration lands in
              Week 4.
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
                Save
              </button>
              {notice && (
                <div className="text-xs text-bb-primary mt-1">{notice}</div>
              )}
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
            <h2 className="font-semibold mb-2">Coming in Week 4</h2>
            <ul className="text-sm text-gray-400 space-y-1 list-disc list-inside">
              <li>Workspace folder relocation</li>
              <li>Theme + appearance customization</li>
              <li>Notifications</li>
              <li>Integrations (GitHub, Google Drive)</li>
              <li>Account &amp; billing</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
