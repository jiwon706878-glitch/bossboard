"use client";

import { useEffect, useState, memo } from "react";
import { Plus, Trash2, Edit2, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  loadKeys,
  addKey,
  deleteKeyById,
  PROVIDERS,
  type APIKey,
  type AIProvider,
} from "@/lib/ai/keys";
import { getKey, setKey } from "@/lib/tauri/keychain";
import { downloadExport } from "@/lib/export/data-export";

export default function SettingsPage() {
  const [keys, setKeys] = useState<APIKey[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editingKey, setEditingKey] = useState<APIKey | null>(null);
  const [githubToken, setGithubToken] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setKeys(await loadKeys());
        setGithubToken((await getKey("github_token")) ?? "");
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : String(e));
      }
    })();
  }, []);

  async function handleSaveKey(key: APIKey) {
    try {
      const next = await addKey(key);
      setKeys(next);
      setShowAdd(false);
      setEditingKey(null);
      setNotice(`Saved ${PROVIDERS[key.provider].label} key “${key.name}”.`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function handleDelete(id: string) {
    try {
      const next = await deleteKeyById(id);
      setKeys(next);
      setNotice("Key removed from OS keychain.");
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
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-semibold">AI providers (BYOK)</h2>
              <button
                onClick={() => setShowAdd(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-bb-primary hover:bg-bb-primary-hover rounded-md text-sm"
              >
                <Plus className="w-4 h-4" /> Add API key
              </button>
            </div>
            <p className="text-xs text-gray-400 mb-4">
              Stored in your OS keychain (Windows Credential Manager / macOS Keychain).
              Your provider bills you directly — BossBoard charges $0 for AI usage.
            </p>

            {keys.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-bb-border rounded-lg">
                <p className="text-sm text-gray-400 mb-3">No API keys configured yet.</p>
                <button
                  onClick={() => setShowAdd(true)}
                  className="px-3 py-1.5 bg-bb-primary hover:bg-bb-primary-hover rounded-md text-sm"
                >
                  Add your first key
                </button>
              </div>
            ) : (
              <motion.div layout className="space-y-2">
                <AnimatePresence>
                  {keys.map((k) => (
                    <KeyCard
                      key={k.id}
                      apiKey={k}
                      onEdit={() => setEditingKey(k)}
                      onDelete={() => handleDelete(k.id)}
                    />
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
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

      <AnimatePresence>
        {(showAdd || editingKey) && (
          <KeyModal
            existingKey={editingKey}
            onSave={handleSaveKey}
            onClose={() => {
              setShowAdd(false);
              setEditingKey(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

const KeyCard = memo(function KeyCard({
  apiKey,
  onEdit,
  onDelete,
}: {
  apiKey: APIKey;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const provider = PROVIDERS[apiKey.provider];
  const masked = apiKey.key.length > 10
    ? apiKey.key.slice(0, 6) + "…" + apiKey.key.slice(-4)
    : "(set)";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="flex items-center gap-3 p-3 bg-bb-bg rounded-lg border border-bb-border hover:border-bb-primary/50 transition-colors"
    >
      <span className="w-8 h-8 grid place-items-center rounded-md bg-bb-primary/10 text-bb-primary text-sm font-bold">
        {provider.icon}
      </span>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm">{apiKey.name}</div>
        <div className="text-xs text-gray-400 truncate">
          {provider.label} · <span className="font-mono">{masked}</span>
        </div>
        {apiKey.notes && (
          <div className="text-xs text-gray-500 mt-0.5 truncate">{apiKey.notes}</div>
        )}
      </div>
      <div className="flex gap-1">
        <button
          onClick={onEdit}
          className="p-1.5 hover:bg-bb-card rounded"
          title="Edit"
        >
          <Edit2 className="w-4 h-4" />
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 hover:bg-red-900/20 hover:text-red-400 rounded"
          title="Delete"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
});

function KeyModal({
  existingKey,
  onSave,
  onClose,
}: {
  existingKey: APIKey | null;
  onSave: (key: APIKey) => void;
  onClose: () => void;
}) {
  const [provider, setProvider] = useState<AIProvider>(
    existingKey?.provider ?? "google",
  );
  const [name, setName] = useState(existingKey?.name ?? "");
  const [keyValue, setKeyValue] = useState(existingKey?.key ?? "");
  const [notes, setNotes] = useState(existingKey?.notes ?? "");

  function handleSubmit() {
    if (!name.trim() || !keyValue.trim()) return;
    onSave({
      id: existingKey?.id ?? crypto.randomUUID(),
      provider,
      name: name.trim(),
      key: keyValue.trim(),
      notes: notes.trim() || undefined,
      createdAt: existingKey?.createdAt ?? new Date().toISOString(),
      lastUsedAt: existingKey?.lastUsedAt,
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 10, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.95, y: 10, opacity: 0 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="bg-bb-card border border-bb-border rounded-lg p-6 w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold mb-4">
          {existingKey ? "Edit API key" : "Add API key"}
        </h2>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-400">Provider</label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as AIProvider)}
              className="w-full mt-1 p-2 bg-bb-bg border border-bb-border rounded-md text-sm"
            >
              {Object.entries(PROVIDERS).map(([key, p]) => (
                <option key={key} value={key}>
                  {p.icon} · {p.label}
                </option>
              ))}
            </select>
            {PROVIDERS[provider].docsUrl && (
              <a
                href={PROVIDERS[provider].docsUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-bb-primary hover:underline mt-1 inline-flex items-center gap-1"
              >
                Get your {PROVIDERS[provider].label} key
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          <div>
            <label className="text-xs text-gray-400">Name (for your reference)</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Production, Personal, Test account"
              className="w-full mt-1 p-2 bg-bb-bg border border-bb-border rounded-md text-sm"
            />
          </div>

          <div>
            <label className="text-xs text-gray-400">API key</label>
            <input
              type="password"
              value={keyValue}
              onChange={(e) => setKeyValue(e.target.value)}
              placeholder={PROVIDERS[provider].keyPrefix + "…"}
              className="w-full mt-1 p-2 bg-bb-bg border border-bb-border rounded-md font-mono text-sm"
            />
          </div>

          <div>
            <label className="text-xs text-gray-400">Notes (optional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Free tier 250 req/day"
              className="w-full mt-1 p-2 bg-bb-bg border border-bb-border rounded-md text-sm"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm hover:bg-bb-bg rounded-md border border-bb-border"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim() || !keyValue.trim()}
            className="px-3 py-1.5 text-sm bg-bb-primary hover:bg-bb-primary-hover disabled:opacity-50 rounded-md"
          >
            Save
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
