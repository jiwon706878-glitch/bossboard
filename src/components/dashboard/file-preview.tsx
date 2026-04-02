"use client";

import { useEffect, useState } from "react";
import { X, Download, ExternalLink } from "lucide-react";

interface FilePreviewProps {
  file: { name: string; url: string; type: string; size?: number } | null;
  onClose: () => void;
}

function getFileCategory(type: string, name: string): "image" | "pdf" | "office" | "text" | "unknown" {
  if (type.startsWith("image/")) return "image";
  if (type === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  if (
    type.includes("word") || type.includes("spreadsheet") || type.includes("presentation") ||
    type.includes("ms-excel") || type.includes("ms-powerpoint") ||
    name.endsWith(".docx") || name.endsWith(".doc") ||
    name.endsWith(".xlsx") || name.endsWith(".xls") ||
    name.endsWith(".pptx") || name.endsWith(".ppt")
  ) return "office";
  if (type.startsWith("text/") || name.endsWith(".txt") || name.endsWith(".csv")) return "text";
  return "unknown";
}

export function FilePreview({ file, onClose }: FilePreviewProps) {
  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  if (!file) return null;

  const category = getFileCategory(file.type, file.name);
  const encodedUrl = encodeURIComponent(file.url);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black/80 backdrop-blur-sm animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/50">
        <div className="flex items-center gap-3 min-w-0">
          <p className="text-sm font-medium text-white truncate">{file.name}</p>
          {file.size != null && (
            <span className="text-xs text-white/50 shrink-0">
              {file.size > 1024 * 1024
                ? `${(file.size / 1024 / 1024).toFixed(1)}MB`
                : `${(file.size / 1024).toFixed(0)}KB`}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <a
            href={file.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/70 hover:text-white"
            title="Open in new tab"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
          <a
            href={file.url}
            download={file.name}
            className="text-white/70 hover:text-white"
            title="Download"
          >
            <Download className="h-4 w-4" />
          </a>
          <button
            type="button"
            onClick={onClose}
            className="text-white/70 hover:text-white ml-2"
            aria-label="Close preview"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Preview Content */}
      <div className="flex-1 flex items-center justify-center overflow-auto p-4" onClick={onClose}>
        <div onClick={(e) => e.stopPropagation()}>
          {category === "image" && (
            <img
              src={file.url}
              alt={file.name}
              className="max-w-full max-h-[calc(100vh-80px)] object-contain rounded-lg"
            />
          )}

          {category === "pdf" && (
            <iframe
              src={file.url}
              className="w-[90vw] h-[calc(100vh-80px)] rounded-lg bg-white"
              title={file.name}
            />
          )}

          {category === "office" && (
            <iframe
              src={`https://docs.google.com/gview?url=${encodedUrl}&embedded=true`}
              className="w-[90vw] h-[calc(100vh-80px)] rounded-lg bg-white"
              title={file.name}
            />
          )}

          {category === "text" && (
            <TextPreview url={file.url} />
          )}

          {category === "unknown" && (
            <div className="text-center text-white/70 space-y-4">
              <p className="text-lg">Preview not available</p>
              <p className="text-sm">This file type cannot be previewed. You can download it instead.</p>
              <a
                href={file.url}
                download={file.name}
                className="inline-flex items-center gap-2 rounded-md bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20"
              >
                <Download className="h-4 w-4" />
                Download {file.name}
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TextPreview({ url }: { url: string }) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(url)
      .then((res) => res.text())
      .then((text) => { setContent(text); setLoading(false); })
      .catch(() => { setContent("Failed to load file"); setLoading(false); });
  }, [url]);

  if (loading) return <div className="text-white/50">Loading...</div>;

  return (
    <pre className="w-full max-w-3xl max-h-[calc(100vh-80px)] overflow-auto rounded-lg bg-white/5 p-6 text-sm text-white/90 font-mono">
      {content}
    </pre>
  );
}
