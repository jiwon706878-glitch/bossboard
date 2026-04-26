"use client";

export default function AboutPage() {
  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-2xl font-bold mb-1">About</h1>
      <p className="text-sm text-gray-400 mb-6">
        BossBoard Beta v0.1 — local-first AI agent workspace.
      </p>

      <section className="p-6 bg-bb-card rounded-md border border-bb-border space-y-4">
        <div>
          <h2 className="font-semibold mb-1">Profile picture</h2>
          <p className="text-xs text-gray-400">
            v3.0 uses a local initial-based avatar. Cloud avatar upload is a{" "}
            <span className="text-bb-primary">Pro plan</span> feature and ships with the
            Pro launch.
          </p>
        </div>

        <div className="pt-4 border-t border-bb-border">
          <h2 className="font-semibold mb-2">Roadmap to launch</h2>
          <ul className="text-sm text-gray-400 space-y-1 list-disc list-inside">
            <li>Workspace folder relocation (post-launch hotfix)</li>
            <li>Notifications via Supabase Realtime (post-launch hotfix)</li>
            <li>Board (post-launch hotfix)</li>
            <li>Cloud avatar upload (Pro launch)</li>
            <li>OAuth-based GitHub + Google Drive MCP (v3.1)</li>
            <li>Multi-device sync (v3.2)</li>
          </ul>
        </div>

        <div className="pt-4 border-t border-bb-border">
          <h2 className="font-semibold mb-2">Build</h2>
          <ul className="text-sm text-gray-400 space-y-1">
            <li>Tauri v2 + Rust backend</li>
            <li>React + TypeScript + TipTap frontend</li>
            <li>SQLite (local metadata) · Supabase (auth + cloud metadata)</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
