"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, Lock, Shield } from "lucide-react";
import { usePlan } from "@/lib/auth/use-plan";
import { isFeatureAvailable } from "@/lib/plan-gate";
import { UpgradeModal } from "@/components/desktop/upgrade-modal";
import { FeatureStatusBadge } from "@/components/desktop/feature-status-badge";

export default function EmailIntegrationPage() {
  const { plan } = usePlan();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const available = isFeatureAvailable("email_integration", plan);

  return (
    <div className="p-8 max-w-3xl">
      <Link
        href="/desktop/settings/integrations"
        className="text-sm text-gray-400 hover:text-white inline-flex items-center gap-1 mb-2"
      >
        ← Integrations
      </Link>
      <div className="flex items-center gap-2 mb-1">
        <h1 className="text-2xl font-bold">Email Integration</h1>
        <FeatureStatusBadge status="coming-soon" />
      </div>
      <p className="text-sm text-gray-400 mb-6">
        Connect your work email so agents can read, search, and draft replies.
      </p>

      {!available ? (
        <section className="rounded-lg border-2 border-amber-500/30 bg-amber-500/5 p-6 mb-6">
          <div className="flex items-start gap-3">
            <Lock className="size-5 text-amber-400 mt-0.5 shrink-0" />
            <div>
              <h3 className="font-semibold mb-2">Pro+ feature</h3>
              <p className="text-sm text-gray-400 mb-4">
                Email Integration is available on Pro and Business plans.
              </p>
              <ul className="text-sm space-y-1 mb-5 text-gray-300">
                <li>✓ Read incoming emails (with your permission)</li>
                <li>✓ Auto-classify (urgent / normal / spam)</li>
                <li>✓ &ldquo;Summarise last week&apos;s emails from Kim&rdquo;</li>
                <li>✓ AI-drafted replies — you review before sending</li>
                <li>✓ Gmail / Outlook OAuth + Custom IMAP/SMTP</li>
                <li>🛡️ Auto-sending blocked by default — your approval always</li>
              </ul>
              <button
                onClick={() => setShowUpgrade(true)}
                className="px-4 py-2 bg-bb-primary hover:bg-bb-primary-hover rounded-md text-sm"
              >
                Upgrade to Pro
              </button>
            </div>
          </div>
        </section>
      ) : (
        <section className="rounded-lg border border-bb-border bg-bb-card p-6 mb-6">
          <div className="flex items-start gap-3">
            <Mail className="size-5 text-bb-primary mt-0.5 shrink-0" />
            <div>
              <h3 className="font-semibold mb-2">Coming soon (v3.1)</h3>
              <p className="text-sm text-gray-400 mb-4">
                Your Pro plan unlocks Email Integration. The connection flows
                (Gmail OAuth / Outlook OAuth / Custom IMAP-SMTP) ship in v3.1
                — currently the Tauri OAuth deep-link wiring and IMAP/SMTP
                clients are in active development.
              </p>
              <p className="text-xs text-gray-500">
                We&apos;ll email <strong>everyone on the Pro plan</strong> when
                this lands so you can connect on day one.
              </p>
            </div>
          </div>
        </section>
      )}

      <section className="rounded-lg border-l-4 border-blue-500 bg-blue-900/15 p-4 text-sm space-y-2">
        <div className="flex items-center gap-2 font-medium">
          <Shield className="size-4 text-blue-400" />
          Security defaults
        </div>
        <ul className="list-disc list-inside text-gray-400 space-y-0.5">
          <li>Read-only by default — auto-sending is OFF</li>
          <li>Drafted replies require your explicit approval before sending</li>
          <li>OAuth tokens encrypted via the OS keychain</li>
          <li>
            Disable any time — all data remains in your accounts (BossBoard
            doesn&apos;t store emails on its servers)
          </li>
        </ul>
      </section>

      <section className="mt-6 rounded-lg border border-bb-border p-4 text-sm">
        <h4 className="font-semibold mb-2">Agent tools (when shipped)</h4>
        <ul className="space-y-1 text-gray-400 font-mono text-xs">
          <li>• <code>email_list</code> — list recent (last N days)</li>
          <li>• <code>email_search</code> — search by sender / subject / content</li>
          <li>• <code>email_read</code> — read full content of one email</li>
          <li>• <code>email_draft_reply</code> — save a draft (never auto-sent)</li>
          <li className="text-gray-500">
            • <code>email_send</code> — explicitly excluded; user-only action
          </li>
        </ul>
      </section>

      {showUpgrade && (
        <UpgradeModal
          feature="email_integration"
          requiredPlan="pro"
          onClose={() => setShowUpgrade(false)}
          onUpgrade={() =>
            window.open("https://mybossboard.com/pricing", "_blank")
          }
        />
      )}
    </div>
  );
}
