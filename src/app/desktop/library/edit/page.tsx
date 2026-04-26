"use client";

import { useEffect, useState, Suspense, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { invoke } from "@tauri-apps/api/core";
import { readLibraryFile, saveLibraryFile } from "@/lib/library/service";
import { type Frontmatter } from "@/lib/markdown/frontmatter";
import { createDirectory } from "@/lib/tauri/fs";
import { FormatWarning } from "@/components/library/format-warning";
import { normalizeAssetName } from "@/lib/library/asset-name";

const MarkdownRenderer = dynamic(
  () =>
    import("@/components/library/markdown-renderer").then((m) => m.MarkdownRenderer),
  {
    ssr: false,
    loading: () => (
      <div className="h-[60vh] bg-bb-card border border-bb-border rounded-md animate-pulse" />
    ),
  },
);

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

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    const assetsPath = filePath.replace(/\.md$/, ".assets");
    const assetsFolderName = (filePath.split(/[\\/]/).pop() || "").replace(/\.md$/, ".assets");

    try {
      await createDirectory(assetsPath);
      let inserts = "";
      for (const file of files) {
        if (!file.type.startsWith("image/")) continue;
        const safeName = normalizeAssetName(file.name);
        const destPath = `${assetsPath}/${safeName}`;
        const arrayBuffer = await file.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        let binary = "";
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
        const base64Data = btoa(binary);
        await invoke("write_binary_file", { path: destPath, base64Data });
        inserts += `\n![${file.name}](${assetsFolderName}/${safeName})\n`;
      }
      if (inserts) {
        setContent((c) => c + inserts);
        setDirty(true);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setEditorError(`Attachment failed: ${msg}`);
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
  }

  const folderPath = filePath ? filePath.substring(0, filePath.lastIndexOf("/")) : undefined;

  if (loading) {
    return <div className="p-8 text-bb-fg">Loading…</div>;
  }
  if (!frontmatter) {
    return <div className="p-8 text-bb-fg">File not found</div>;
  }

  return (
    <div onDrop={handleDrop} onDragOver={handleDragOver}>
      <div className="sticky top-0 bg-bb-bg border-b border-bb-border px-6 py-3 flex items-center justify-between z-10">
        <Link href="/desktop/library" className="text-sm text-gray-400 hover:text-white">
          ← Library
        </Link>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md overflow-hidden border border-bb-border">
            {(["source", "live", "preview"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-3 py-1 text-xs ${
                  mode === m ? "bg-bb-primary" : "bg-bb-card hover:bg-bb-bg"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
          <button
            onClick={handleSave}
            disabled={saving || !dirty}
            className="px-4 py-1.5 bg-bb-primary hover:bg-bb-primary-hover rounded-md text-sm disabled:opacity-50"
          >
            {saving ? "Saving..." : dirty ? "Save" : "Saved"}
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 w-full">
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

        <FormatWarning content={content} storageKey={`bb-fmt-warn:${filePath}`} />

        {mode === "source" && (
          <textarea
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              setDirty(true);
            }}
            className="w-full h-[60vh] bg-bb-card border border-bb-border rounded-md p-4 font-mono text-sm"
          />
        )}
        {mode === "live" && (
          <textarea
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              setDirty(true);
            }}
            placeholder="Drop images here to attach…"
            className="library-content w-full h-[60vh] bg-transparent border border-bb-border rounded-md p-4"
          />
        )}
        {mode === "preview" && (
          <div className="library-content prose prose-invert max-w-none">
            <MarkdownRenderer content={content} editable={false} basePath={folderPath} />
          </div>
        )}

        <p className="mt-6 text-xs text-gray-500">
          Need to translate? Just ask any agent in DM:
          “Translate this document to Korean”.
        </p>
      </div>
    </div>
  );
}

export default function EditorPage() {
  return (
    <Suspense fallback={<div className="p-8 text-bb-fg">Loading…</div>}>
      <EditorInner />
    </Suspense>
  );
}
