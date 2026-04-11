import type { JSONContent } from "@tiptap/react";

/**
 * Extract plain text from a TipTap JSON document. Used by the
 * auto-indexer to feed a readable document to Gemini. We don't use
 * markdown here because the indexing prompt doesn't need heading/
 * list structure — just the words.
 *
 * Walks all `text` nodes recursively and joins them with spaces and
 * paragraph breaks. Returns an empty string on null/malformed input
 * so callers can safely short-circuit on `text.length < 100`.
 */
export function tiptapToPlainText(content: JSONContent | null): string {
  if (!content) return "";

  const parts: string[] = [];

  function walk(node: JSONContent) {
    if (!node) return;
    if (typeof node.text === "string") {
      parts.push(node.text);
    }
    if (Array.isArray(node.content)) {
      for (const child of node.content) walk(child);
      // Paragraph-level separator so words from different paragraphs
      // don't run together.
      if (
        node.type === "paragraph" ||
        node.type === "heading" ||
        node.type === "listItem"
      ) {
        parts.push("\n");
      }
    }
  }

  walk(content);
  return parts.join(" ").replace(/\s+/g, " ").trim();
}
