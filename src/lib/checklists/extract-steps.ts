import type { JSONContent } from "@tiptap/react";

interface ChecklistItem {
  text: string;
  required: boolean;
}

const SECTION_HEADERS = new Set([
  "title",
  "purpose",
  "scope",
  "step-by-step procedure",
  "stepbystep procedure",
  "procedure",
  "safety/compliance notes",
  "safety notes",
  "compliance notes",
  "safety and compliance notes",
  "checklist summary",
  "summary",
  "overview",
  "introduction",
  "references",
  "revision history",
  "personal protective equipment",
  "ppe requirements",
  "equipment needed",
  "materials needed",
  "prerequisites",
  "definitions",
  "responsibilities",
]);

function isSectionHeader(text: string): boolean {
  const lower = text
    .toLowerCase()
    .replace(/^\d+[\.\)]\s*/, "") // Strip leading "1. ", "2) " etc.
    .replace(/[:\-–—]/g, "")
    .trim();
  if (SECTION_HEADERS.has(lower)) return true;
  // Skip if it's a very short heading-like text with no verb
  if (lower.length < 4) return true;
  return false;
}

function isActionItem(text: string): boolean {
  // Must be reasonably long
  if (text.length < 5) return false;
  // Skip pure section headers
  if (isSectionHeader(text)) return false;
  // Skip lines that look like descriptive paragraphs (very long, no actionable content)
  if (text.length > 200 && !text.includes("□") && !text.includes("☐")) return false;
  return true;
}

function cleanItemText(text: string): string {
  return text
    .replace(/^\d+[\.\)]\s*/, "") // Remove leading numbers "1. " or "1) "
    .replace(/^[-•□☐✓✔]\s*/, "") // Remove bullets/checkboxes
    .replace(/^\*\s*/, "") // Remove markdown bullets
    .trim();
}

/**
 * Extracts actionable checklist items from TipTap JSON content.
 * Prioritizes:
 * 1. "Checklist summary" section items
 * 2. Numbered sub-items under "Step-by-step procedure"
 * 3. Any bulleted/numbered action items
 */
export function extractStepsFromContent(
  content: JSONContent | null
): ChecklistItem[] {
  if (!content?.content) return [];

  // First pass: extract all text with structure info
  const allText = flattenContent(content);

  // Try to find "Checklist summary" section first
  const checklistSection = findSection(allText, [
    "checklist summary",
    "checklist",
    "summary checklist",
  ]);

  if (checklistSection.length > 0) {
    return checklistSection
      .filter((t) => isActionItem(t))
      .map((t) => ({ text: cleanItemText(t), required: true }))
      .filter((item) => item.text.length > 0);
  }

  // Try "Step-by-step procedure" section
  const stepsSection = findSection(allText, [
    "step-by-step procedure",
    "procedure",
    "steps",
    "instructions",
  ]);

  if (stepsSection.length > 0) {
    return stepsSection
      .filter((t) => isActionItem(t))
      .map((t) => ({ text: cleanItemText(t), required: true }))
      .filter((item) => item.text.length > 0);
  }

  // Fallback: extract all list items and numbered lines
  const items: ChecklistItem[] = [];

  for (const node of content.content) {
    if (node.type === "orderedList" || node.type === "bulletList") {
      for (const listItem of node.content ?? []) {
        const text = extractText(listItem);
        if (text && isActionItem(text)) {
          items.push({ text: cleanItemText(text), required: true });
        }
      }
      continue;
    }

    if (node.type === "paragraph") {
      const text = extractText(node);
      if (text && /^\d+[\.\)]\s/.test(text)) {
        const cleaned = cleanItemText(text);
        if (cleaned && isActionItem(cleaned)) {
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

/**
 * Flatten content into an array of { text, isListItem, depth } entries.
 */
function flattenContent(content: JSONContent): string[] {
  const lines: string[] = [];

  for (const node of content.content ?? []) {
    if (node.type === "heading" || node.type === "paragraph") {
      const text = extractText(node);
      if (text) lines.push(text);
    }
    if (node.type === "orderedList" || node.type === "bulletList") {
      for (const listItem of node.content ?? []) {
        const text = extractText(listItem);
        if (text) lines.push(text);
      }
    }
  }

  return lines;
}

/**
 * Find all items that come after a section heading matching one of the given names,
 * until the next section heading.
 */
function findSection(lines: string[], sectionNames: string[]): string[] {
  let inSection = false;
  const items: string[] = [];

  for (const line of lines) {
    const lower = line.toLowerCase().replace(/[:\-–—]/g, "").trim();
    const lowerNoNum = lower.replace(/^\d+[\.\)]\s*/, "");

    // Check if this line is the section header we're looking for
    if (sectionNames.some((name) => lowerNoNum === name || lowerNoNum.startsWith(name))) {
      inSection = true;
      continue;
    }

    // Check if we've hit a new section header (stop collecting)
    if (inSection && isSectionHeader(line)) {
      break;
    }

    if (inSection && line.trim()) {
      items.push(line);
    }
  }

  return items;
}
