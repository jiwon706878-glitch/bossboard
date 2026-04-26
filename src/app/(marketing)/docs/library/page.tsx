import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Library — BossBoard Docs",
};

export default function LibraryDocPage() {
  return (
    <main className="py-16 px-6">
      <div className="max-w-3xl mx-auto prose prose-invert dark:prose-invert">
        <Link
          href="/docs"
          className="text-sm text-primary hover:underline no-underline"
        >
          ← Docs
        </Link>
        <h1>Library</h1>
        <p>
          The Library is the user-facing knowledge base. Everything you put
          here is plain markdown on disk, indexed for full-text search, and
          readable by your agents.
        </p>

        <h2>File format</h2>
        <p>
          BossBoard markdown files use YAML frontmatter:
        </p>
        <pre>
          <code>{`---
id: "wiki_abc123"
title: "Q3 Marketing Plan"
tags: ["marketing", "q3"]
agent_access: ["Marketing-Lead", "Personal-Assistant"]
created: "2026-04-23T10:00:00Z"
modified: "2026-04-23T14:30:00Z"
hash: "sha256:..."
---

# Q3 Marketing Plan
...`}</code>
        </pre>
        <p>
          Tags help both you and your agents search. <code>agent_access</code>
          is a hint — agents respect the read scope in their own manual.
        </p>

        <h2>3-mode editor</h2>
        <ul>
          <li>
            <strong>Source</strong> — raw markdown in a textarea. Use this for
            files with HTML, LaTeX, wiki-links, or anything BB&apos;s rich
            renderer might simplify.
          </li>
          <li>
            <strong>Live</strong> — typing surface that flows like the rendered
            output but stays as markdown.
          </li>
          <li>
            <strong>Preview</strong> — read-only render via TipTap.
          </li>
        </ul>
        <p>
          When the file contains complex markdown (HTML tags, LaTeX blocks,
          Obsidian admonitions, wiki-links), an amber{" "}
          <strong>FormatWarning</strong> banner appears at the top of the
          editor. The file on disk is untouched until you save in rich mode.
        </p>

        <h2>Drag-drop attachments</h2>
        <p>
          Drop image files anywhere on the editor surface. BossBoard creates
          a sibling <code>{`{filename}.assets/`}</code> folder, normalises the
          attachment name (lowercase, safe characters only — works across
          NTFS and APFS), and inserts a relative markdown image link.
        </p>

        <h2>Auto-backup</h2>
        <p>
          The metadata SQLite is snapshotted before every schema migration to
          a sibling <code>metadata.v{`{N}`}.backup.sqlite</code> file inside
          the Tauri app-data directory. A daily JSON snapshot of metadata
          lives under <code>.bb/backups/</code>.
        </p>

        <h2>Trash</h2>
        <p>
          Deletes (when wired through the agent flow) move to{" "}
          <code>.bb/trash/</code> with a 30-day retention.
        </p>
      </div>
    </main>
  );
}
