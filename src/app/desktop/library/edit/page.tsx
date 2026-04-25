"use client";

import { useEffect, useState, Suspense, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { readLibraryFile, saveLibraryFile } from "@/lib/library/service";
import { type Frontmatter } from "@/lib/markdown/frontmatter";

function EditorInner() {
  const params = useSearchParams();
  const filePath = params.get("path") || "";

  const [frontmatter, setFrontmatter] = useState<Frontmatter | null>(null);
  const [content, setContent] = useState("");
  const [mode, setMode] = useState<"source" | "live" | "preview">("live");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [editorError, setEditorError] = useState<string | null>(null);

  useEffect(() => {
    if (!filePath) return;
    (async () => {
      try {
        const { frontmatter, content } = await readLibraryFile(filePath);
        setFrontmatter(frontmatter);
        setContent(content);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        setEditorError(`Failed to load: ${msg}`);
      } finally {
        setLoading(false);
      }
    })();
  }, [filePath]);

  const handleSave = useCallback(async () => {
    if (!frontmatter) return;
    setSaving(true);
    setEditorError(null);
    try {
      await saveLibraryFile(filePath, frontmatter, content);
      setDirty(false);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setEditorError(`Failed to save: ${msg}`);
    } finally {
      setSaving(false);
    }
  }, [frontmatter, content, filePath]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSave]);

  if (loading) {
    return <div className="min-h-screen bg-[#0C0F17] text-white p-8">Loading…</div>;
  }

  if (!frontmatter) {
    return <div className="min-h-screen bg-[#0C0F17] text-white p-8">File not found</div>;
  }

  return (
    <div className="min-h-screen bg-[#0C0F17] text-white">
      <div className="sticky top-0 bg-[#0C0F17] border-b border-gray-800 px-6 py-3 flex items-center justify-between z-10">
        <Link href="/desktop/library" className="text-sm text-gray-400 hover:text-white">
          ← Library
        </Link>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md overflow-hidden border border-gray-700">
            {(["source", "live", "preview"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-3 py-1 text-xs ${
                  mode === m ? "bg-blue-600" : "bg-[#141824] hover:bg-gray-800"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
          <button
            onClick={handleSave}
            disabled={saving || !dirty}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-md text-sm disabled:opacity-50"
          >
            {saving ? "Saving..." : dirty ? "Save" : "Saved"}
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-8">
        {editorError && (
          <div className="mb-4 p-3 bg-red-900/20 border border-red-800 rounded-md text-red-300 text-sm">
            <div>{editorError}</div>
            <button
              onClick={() => setEditorError(null)}
              className="text-xs underline mt-2"
            >
              Dismiss
            </button>
          </div>
        )}

        <input
          type="text"
          value={frontmatter.title}
          onChange={(e) => {
            setFrontmatter({ ...frontmatter, title: e.target.value });
            setDirty(true);
          }}
          className="w-full text-3xl font-bold bg-transparent border-none outline-none mb-6"
        />

        {mode === "source" && (
          <textarea
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              setDirty(true);
            }}
            className="w-full h-[60vh] bg-[#141824] border border-gray-700 rounded-md p-4 font-mono text-sm"
          />
        )}

        {mode === "live" && (
          <textarea
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              setDirty(true);
            }}
            className="w-full h-[60vh] bg-transparent border border-gray-800 rounded-md p-4 text-base leading-relaxed"
          />
        )}

        {mode === "preview" && (
          <div className="prose prose-invert max-w-none">
            <pre className="whitespace-pre-wrap">{content}</pre>
            <p className="text-xs text-gray-500 mt-4">
              Rendered preview will use TipTap/markdown renderer in Week 3
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function EditorPage() {
  return (
    <Suspense fallback={<div className="p-8 text-white">Loading…</div>}>
      <EditorInner />
    </Suspense>
  );
}
