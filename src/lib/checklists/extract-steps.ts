import type { JSONContent } from "@tiptap/react";

interface ChecklistItem {
  text: string;
  required: boolean;
}

/**
 * Extracts numbered/bulleted steps from TipTap JSON content
 * to create checklist items.
 */
export function extractStepsFromContent(
  content: JSONContent | null
): ChecklistItem[] {
  if (!content?.content) return [];

  const items: ChecklistItem[] = [];

  for (const node of content.content) {
    // Handle ordered/bullet list items
    if (node.type === "orderedList" || node.type === "bulletList") {
      for (const listItem of node.content ?? []) {
        const text = extractText(listItem);
        if (text) {
          items.push({ text, required: true });
        }
      }
      continue;
    }

    // Handle paragraphs that look like numbered steps (e.g., "1. Do something")
    if (node.type === "paragraph") {
      const text = extractText(node);
      if (text && /^\d+[\.\)]\s/.test(text)) {
        const cleaned = text.replace(/^\d+[\.\)]\s*/, "").trim();
        if (cleaned) {
          items.push({ text: cleaned, required: true });
        }
      }
    }
  }

  return items;
}

function extractText(node: JSONContent): string {
  if (node.type === "text" && node.text) return node.text;
  if (!node.content) return "";
  return node.content.map(extractText).join("").trim();
}
