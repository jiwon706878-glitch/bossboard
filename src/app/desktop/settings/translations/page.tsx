"use client";

import { useEffect, useState } from "react";
import { Send, Download, Globe } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import {
  ALL_LOCALES,
  LOCALE_NAMES,
  SUPPORTED_LOCALES,
  type Locale,
} from "@/i18n/config";
import { isTauri } from "@/lib/tauri/fs";
import { createClient } from "@/lib/supabase/client";
import { FeatureStatusBadge } from "@/components/desktop/feature-status-badge";

interface MessageEntry {
  key: string;
  english: string;
  translation: string;
}

const FUTURE_LOCALES = ALL_LOCALES.filter(
  (l) => !(SUPPORTED_LOCALES as readonly string[]).includes(l),
);

export default function TranslationsPage() {
  const [selectedLocale, setSelectedLocale] = useState<Locale>(
    FUTURE_LOCALES[0],
  );
  const [entries, setEntries] = useState<MessageEntry[]>([]);
  const [stats, setStats] = useState({ total: 0, translated: 0 });
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTranslations(selectedLocale);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLocale]);

  function workspace(): string {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("bb_workspace_path") || "";
  }

  async function loadTranslations(locale: Locale) {
    setError(null);
    try {
      const englishMessages = await fetch("/messages/en.json")
        .then((r) => r.json())
        .catch(() => ({}));
      let userOverrides: Record<string, string> = {};
      if (isTauri()) {
        userOverrides = await invoke<Record<string, string>>(
          "load_user_translations",
          { workspaceRoot: workspace(), locale },
        ).catch(() => ({}));
      }

      const flat: MessageEntry[] = [];
      function walk(obj: unknown, prefix = "") {
        if (!obj || typeof obj !== "object") return;
        for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
          const fullKey = prefix ? `${prefix}.${k}` : k;
          if (typeof v === "string") {
            flat.push({
              key: fullKey,
              english: v,
              translation: userOverrides[fullKey] ?? "",
            });
          } else if (v && typeof v === "object") {
            walk(v, fullKey);
          }
        }
      }
      walk(englishMessages);

      setEntries(flat);
      setStats({
        total: flat.length,
        translated: flat.filter((e) => e.translation).length,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function handleSave(key: string, translation: string) {
    if (!isTauri()) return;
    try {
      await invoke("save_user_translation", {
        workspaceRoot: workspace(),
        locale: selectedLocale,
        key,
        translation,
      });
      const next = entries.map((e) =>
        e.key === key ? { ...e, translation } : e,
      );
      setEntries(next);
      setStats({
        total: next.length,
        translated: next.filter((e) => e.translation).length,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const overrides: Record<string, string> = isTauri()
        ? await invoke<Record<string, string>>("export_user_translations", {
            workspaceRoot: workspace(),
            locale: selectedLocale,
          })
        : {};

      if (Object.keys(overrides).length === 0) {
        setError("No translations to submit yet — fill in some entries first.");
        return;
      }

      const supabase = createClient();
      const { error: insertError } = await supabase
        .from("community_translations")
        .insert({
          locale: selectedLocale,
          translations: overrides,
          translated_count: stats.translated,
          total_count: stats.total,
        });

      if (insertError) throw insertError;
      setNotice(
        `Submitted ${stats.translated}/${stats.total} translations for ${LOCALE_NAMES[selectedLocale]}. Thank you — we ship approved translations in the next release.`,
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? `Submit failed: ${e.message}`
          : `Submit failed: ${String(e)}`,
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleExport() {
    const overrides: Record<string, string> = isTauri()
      ? await invoke<Record<string, string>>("export_user_translations", {
          workspaceRoot: workspace(),
          locale: selectedLocale,
        }).catch(() => ({}))
      : {};
    const blob = new Blob([JSON.stringify(overrides, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedLocale}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const percent =
    stats.total === 0 ? 0 : Math.round((stats.translated / stats.total) * 100);

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center gap-2 mb-1">
        <h1 className="text-2xl font-bold">Community Translations</h1>
        <FeatureStatusBadge status="beta" />
      </div>
      <p className="text-sm text-gray-400 mb-6">
        Help translate BossBoard into your language. Translations apply locally for
        you immediately, and submitted batches are reviewed by the BB team.
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

      <div className="rounded-lg border-l-4 border-bb-primary bg-bb-primary/5 p-4 text-sm mb-6">
        <p className="font-medium mb-1">How it works</p>
        <ol className="list-decimal list-inside space-y-1 text-gray-400">
          <li>Pick your language below.</li>
          <li>
            Translate any UI text — saves automatically (you can use it locally
            right away).
          </li>
          <li>Submit your batch to share with others.</li>
          <li>BB team reviews and ships approved translations in the next release.</li>
        </ol>
      </div>

      <div className="mb-4">
        <label className="text-sm font-medium flex items-center gap-2">
          <Globe className="size-4" /> Language
        </label>
        <select
          value={selectedLocale}
          onChange={(e) => setSelectedLocale(e.target.value as Locale)}
          className="mt-1 w-full p-2 bg-bb-bg border border-bb-border rounded-md text-sm"
        >
          {FUTURE_LOCALES.map((l) => (
            <option key={l} value={l}>
              {LOCALE_NAMES[l]}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-lg border border-bb-border p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Progress</span>
          <span className="text-sm text-gray-400">
            {stats.translated} / {stats.total} ({percent}%)
          </span>
        </div>
        <div className="h-2 bg-bb-bg rounded-full overflow-hidden">
          <div
            className="h-full bg-bb-primary transition-all"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
        {entries.map((entry) => (
          <div
            key={entry.key}
            className="rounded-lg border border-bb-border p-3 bg-bb-card"
          >
            <div className="text-[11px] text-gray-500 mb-1 font-mono">
              {entry.key}
            </div>
            <div className="text-sm font-medium mb-2">{entry.english}</div>
            <input
              type="text"
              defaultValue={entry.translation}
              placeholder="Type translation…"
              onBlur={(e) => handleSave(entry.key, e.target.value)}
              className="w-full p-2 bg-bb-bg border border-bb-border rounded text-sm"
            />
          </div>
        ))}
      </div>

      <div className="sticky bottom-0 bg-bb-bg/95 backdrop-blur p-3 border-t border-bb-border mt-4 flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={submitting || stats.translated === 0}
          className="px-3 py-2 bg-bb-primary hover:bg-bb-primary-hover rounded-md text-sm inline-flex items-center gap-2 disabled:opacity-50"
        >
          <Send className="size-4" />
          {submitting ? "Submitting…" : `Submit ${stats.translated} translations`}
        </button>
        <button
          onClick={handleExport}
          className="px-3 py-2 border border-bb-border hover:bg-bb-card rounded-md text-sm inline-flex items-center gap-2"
        >
          <Download className="size-4" /> Export JSON
        </button>
      </div>

      <p className="text-xs text-gray-500 mt-4">
        Top contributors get a “Translator” badge and a year of Starter on us.
      </p>
    </div>
  );
}
