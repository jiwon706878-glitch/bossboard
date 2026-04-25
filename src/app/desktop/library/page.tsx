"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listLibrary, createLibraryFile, type LibraryFile } from "@/lib/library/service";

export default function LibraryPage() {
  const [files, setFiles] = useState<LibraryFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newFileName, setNewFileName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  async function loadFiles() {
    try {
      setLoading(true);
      const result = await listLibrary();
      setFiles(result);
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFiles();
  }, []);

  async function handleCreate() {
    if (!newFileName.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      await createLibraryFile(newFileName.trim());
      setNewFileName("");
      await loadFiles();
    } catch (e: unknown) {
      setCreateError(e instanceof Error ? e.message : String(e));
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0C0F17] text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link
              href="/desktop/dashboard"
              className="text-sm text-gray-400 hover:text-white"
            >
              ← Dashboard
            </Link>
            <h1 className="text-3xl font-bold mt-2">Library</h1>
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          <input
            type="text"
            placeholder="New page name..."
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            className="flex-1 p-2 bg-[#141824] border border-gray-700 rounded-md text-sm"
          />
          <button
            onClick={handleCreate}
            disabled={creating || !newFileName.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-md text-sm font-medium disabled:opacity-50"
          >
            Create
          </button>
        </div>

        {createError && (
          <div className="mb-4 p-3 bg-red-900/20 border border-red-800 rounded-md text-red-300 text-sm">
            <div>{createError}</div>
            <button
              onClick={() => setCreateError(null)}
              className="text-xs underline mt-2"
            >
              Dismiss
            </button>
          </div>
        )}

        {loading ? (
          <div className="text-gray-400">Loading…</div>
        ) : error ? (
          <div className="text-red-400">{error}</div>
        ) : files.length === 0 ? (
          <div className="text-gray-400">No files yet. Create your first page above.</div>
        ) : (
          <div className="space-y-2">
            {files.map((f) => (
              <Link
                key={f.path}
                href={`/desktop/library/edit?path=${encodeURIComponent(f.path)}`}
                className="block p-4 bg-[#141824] rounded-md border border-gray-800 hover:border-blue-500 transition"
              >
                <div className="flex items-center gap-2">
                  <span>{f.is_directory ? "📁" : "📄"}</span>
                  <span className="font-medium">
                    {f.frontmatter?.title || f.name.replace(".md", "")}
                  </span>
                  {f.frontmatter?.tags && f.frontmatter.tags.length > 0 && (
                    <div className="flex gap-1 ml-2">
                      {f.frontmatter.tags.map((t) => (
                        <span
                          key={t}
                          className="text-xs bg-gray-800 px-2 py-0.5 rounded"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {f.preview && (
                  <div className="text-sm text-gray-400 mt-1 line-clamp-2">
                    {f.preview}
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
