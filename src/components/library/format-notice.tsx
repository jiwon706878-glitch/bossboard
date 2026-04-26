"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

interface FormatNoticeProps {
  format: "pptx" | "docx" | "pdf" | "xlsx";
}

const NOTICES: Record<FormatNoticeProps["format"], string> = {
  pptx: "PPTX previews are static — animations and slide transitions are not rendered. Full support coming in v3.1.",
  docx: "DOCX previews show simplified formatting. Full layout support coming in v3.1.",
  pdf: "PDF preview is read-only. Full PDF support coming in v3.1.",
  xlsx: "XLSX previews show data only — formulas and charts not rendered. Full support coming in v3.1.",
};

export function FormatNotice({ format }: FormatNoticeProps) {
  const [hidden, setHidden] = useState(true);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    const key = `bb-hide-format-notice-${format}`;
    const stored = typeof window !== "undefined" ? localStorage.getItem(key) : null;
    setHidden(stored === "true");
  }, [format]);

  const handleDismiss = () => {
    if (dontShowAgain) {
      const key = `bb-hide-format-notice-${format}`;
      localStorage.setItem(key, "true");
    }
    setHidden(true);
  };

  if (hidden) return null;

  return (
    <div className="bg-amber-900/20 border-l-4 border-amber-600 p-3 mb-4 rounded-r-md flex items-start gap-3">
      <div className="flex-1">
        <p className="text-sm text-amber-100">{NOTICES[format]}</p>
        <label className="flex items-center gap-2 mt-2 text-xs text-amber-200/80 cursor-pointer">
          <input
            type="checkbox"
            checked={dontShowAgain}
            onChange={(e) => setDontShowAgain(e.target.checked)}
            className="rounded"
          />
          Don&apos;t show this again
        </label>
      </div>
      <button
        onClick={handleDismiss}
        className="text-amber-200/60 hover:text-amber-100"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
