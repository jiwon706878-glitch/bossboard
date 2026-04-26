"use client";

import { Github, Mail } from "lucide-react";
import { FeatureStatusBadge } from "@/components/desktop/feature-status-badge";

export default function AboutPage() {
  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center gap-2 mb-1">
        <h1 className="text-2xl font-bold">About</h1>
        <FeatureStatusBadge status="beta" />
      </div>
      <p className="text-sm text-gray-400 mb-6">
        BossBoard Beta v0.1 — local-first AI agent workspace.
      </p>

      <section className="p-6 bg-bb-card rounded-md border border-bb-border space-y-5">
        <div>
          <h2 className="font-semibold mb-2">This is public beta</h2>
          <p className="text-sm text-gray-300 mb-2">Some things to know:</p>
          <ul className="text-sm text-gray-400 list-disc list-inside space-y-1">
            <li>
              Data loss is unlikely but not impossible — keep important work backed
              up externally too.
            </li>
            <li>
              Auto-backup runs every 24h and keeps 7 days. The metadata DB is also
              snapshotted before any schema migration.
            </li>
            <li>
              Translations beyond English / Korean are AI-generated and may be
              awkward in places (deferred until v3.1 ships locale routing).
            </li>
            <li>macOS native release is in progress (waitlist on website).</li>
            <li>Mobile / web access is planned for v3.2.</li>
          </ul>
          <div className="flex gap-2 pt-3">
            <a
              href="https://github.com/jay/bossboard/issues"
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm border border-bb-border hover:bg-bb-bg rounded-md"
            >
              <Github className="w-4 h-4" /> Report issue
            </a>
            <a
              href="mailto:jay@mybossboard.com?subject=BossBoard%20feedback"
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm border border-bb-border hover:bg-bb-bg rounded-md"
            >
              <Mail className="w-4 h-4" /> Email Jay
            </a>
          </div>
        </div>

        <div className="pt-4 border-t border-bb-border">
          <h2 className="font-semibold mb-1">Profile picture</h2>
          <p className="text-xs text-gray-400">
            v3.0 uses a local initial-based avatar. Cloud avatar upload is a{" "}
            <span className="text-bb-primary">Pro plan</span> feature and ships
            with the Pro launch.
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
            <li>v3.0.0-beta.1</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
