"use client";

import { useState } from "react";
import { X } from "lucide-react";
import {
  SUPPORTED_LANGUAGES,
  translateText,
  type LangCode,
  type TranslationProvider,
} from "@/lib/library/translate";

interface Props {
  sourceContent: string;
  onClose: () => void;
  onTranslated: (langCode: LangCode, langName: string, content: string) => void;
}

export function TranslationPanel({ sourceContent, onClose, onTranslated }: Props) {
  const [lang, setLang] = useState<LangCode>("ko");
  const [provider, setProvider] = useState<TranslationProvider>("google");
  const [translating, setTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setTranslating(true);
    setError(null);
    try {
      const translated = await translateText(sourceContent, lang, provider);
      onTranslated(lang, SUPPORTED_LANGUAGES[lang], translated);
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setTranslating(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-bb-card border border-bb-border rounded-lg shadow-2xl max-w-md w-full mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-bb-border">
          <h3 className="font-semibold">Translate page</h3>
          <button onClick={onClose} className="p-1 hover:bg-bb-bg rounded">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Target language</label>
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value as LangCode)}
              className="w-full p-2 bg-bb-bg border border-bb-border rounded-md text-sm"
            >
              {Object.entries(SUPPORTED_LANGUAGES).map(([code, name]) => (
                <option key={code} value={code}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Provider (BYOK)</label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as TranslationProvider)}
              className="w-full p-2 bg-bb-bg border border-bb-border rounded-md text-sm"
            >
              <option value="google">Google Gemini Flash (cheapest)</option>
              <option value="anthropic">Anthropic Claude Sonnet</option>
            </select>
            <div className="text-[11px] text-gray-500 mt-1">
              Uses the API key saved in Settings. Bills your provider, not BossBoard.
            </div>
          </div>
          {error && (
            <div className="p-2 bg-red-900/20 border border-red-800 rounded text-red-300 text-sm">
              {error}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-sm border border-bb-border hover:bg-bb-bg rounded-md"
            >
              Cancel
            </button>
            <button
              onClick={run}
              disabled={translating || !sourceContent.trim()}
              className="px-3 py-1.5 text-sm bg-bb-primary hover:bg-bb-primary-hover rounded-md disabled:opacity-50"
            >
              {translating ? "Translating…" : "Translate"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
