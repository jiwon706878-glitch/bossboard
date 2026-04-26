"use client";

import { useState } from "react";
import { downloadExport } from "@/lib/export/data-export";

export default function DataPage() {
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

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
    <div className="p-8 max-w-3xl">
      <h1 className="text-2xl font-bold mb-1">Data &amp; Privacy</h1>
      <p className="text-sm text-gray-400 mb-6">
        Download everything BossBoard has about you. Your local workspace folder is
        already plain markdown — usable in any editor.
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

      <section className="p-6 bg-bb-card rounded-md border border-bb-border">
        <h2 className="font-semibold mb-2">Export your data</h2>
        <p className="text-xs text-gray-400 mb-4">
          Includes account profile, board posts, calendar events, and metadata. Workspace
          files (Library, agents) are already on your PC under{" "}
          <code>~/Documents/BossBoard/</code>.
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
            Permanently delete your BossBoard cloud account. Your local workspace folder
            stays on your PC. Self-service deletion ships in v3.1.
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
    </div>
  );
}
