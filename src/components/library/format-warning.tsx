"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";

const COMPLEX_PATTERNS: Array<[RegExp, string]> = [
  [/<[a-zA-Z][^>]*>/, "raw HTML"],
  [/\$\$[\s\S]+?\$\$/, "LaTeX block"],
  [/^[ \t]*::: /m, "Obsidian admonition"],
  [/\[\[.+?\]\]/, "wiki-link"],
  [/^\^[a-zA-Z0-9-]+$/m, "Obsidian block reference"],
];

export function detectComplexMarkdown(content: string): {
  hasComplex: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];
  for (const [pattern, label] of COMPLEX_PATTERNS) {
    if (pattern.test(content)) reasons.push(label);
  }
  return { hasComplex: reasons.length > 0, reasons };
}

interface Props {
  content: string;
  /** Persisted dismissal key — if set, "Don't show again" sticks per file. */
  storageKey?: string;
}

/**
 * Banner shown above the editor when the file contains markdown that the
 * TipTap rich renderer may simplify on round-trip (HTML, LaTeX, wiki-links,
 * Obsidian admonitions/block-refs). Tells the user that BB displays the
 * source as-is until they save in rich mode, and recommends external
 * editors (Obsidian, VS Code) for full fidelity.
 */
export function FormatWarning({ content, storageKey }: Props) {
  const [hidden, setHidden] = useState(true);
  const { reasons } = detectComplexMarkdown(content);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (storageKey && localStorage.getItem(storageKey) === "true") {
      setHidden(true);
      return;
    }
    setHidden(reasons.length === 0);
  }, [reasons.length, storageKey]);

  function dismiss(persist: boolean) {
    if (persist && storageKey) {
      localStorage.setItem(storageKey, "true");
    }
    setHidden(true);
  }

  if (hidden) return null;

  return (
    <div className="border-l-4 border-amber-500 bg-amber-900/20 p-3 mb-3 rounded-r-md flex items-start gap-3">
      <AlertTriangle className="size-4 text-amber-400 mt-0.5 shrink-0" />
      <div className="flex-1 text-sm">
        <div className="font-medium text-amber-200">
          Complex markdown detected ({reasons.join(", ")})
        </div>
        <div className="text-amber-200/80 mt-1 text-xs leading-relaxed">
          BossBoard&apos;s rich editor may simplify these on save. Use{" "}
          <code>source</code> mode to edit the raw markdown, or open the file
          in Obsidian or VS Code for full fidelity. Your file on disk is
          untouched until you save in rich mode.
        </div>
      </div>
      {storageKey ? (
        <button
          onClick={() => dismiss(true)}
          className="text-[11px] text-amber-200/80 hover:text-amber-100 underline whitespace-nowrap"
        >
          Don&apos;t show for this file
        </button>
      ) : null}
      <button
        onClick={() => dismiss(false)}
        className="text-amber-200/60 hover:text-amber-100"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
