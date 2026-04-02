import type { JSONContent } from "@tiptap/react";

export function markdownToTipTap(markdown: string): JSONContent {
  const lines = markdown.split("\n");
  const content: JSONContent[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Headings
    if (line.startsWith("### ")) {
      content.push({ type: "heading", attrs: { level: 3 }, content: parseInline(line.slice(4)) });
    } else if (line.startsWith("## ")) {
      content.push({ type: "heading", attrs: { level: 2 }, content: parseInline(line.slice(3)) });
    } else if (line.startsWith("# ")) {
      content.push({ type: "heading", attrs: { level: 1 }, content: parseInline(line.slice(2)) });
    }
    // Horizontal rule
    else if (line.trim() === "---" || line.trim() === "***") {
      content.push({ type: "horizontalRule" });
    }
    // Code block
    else if (line.startsWith("```")) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      content.push({
        type: "codeBlock",
        content: codeLines.length > 0 ? [{ type: "text", text: codeLines.join("\n") }] : [],
      });
    }
    // Checkbox list
    else if (line.match(/^- \[([ x])\] /)) {
      const items: JSONContent[] = [];
      while (i < lines.length && lines[i].match(/^- \[([ x])\] /)) {
        const match = lines[i].match(/^- \[([ x])\] (.*)/)!;
        items.push({
          type: "taskItem",
          attrs: { checked: match[1] === "x" },
          content: [{ type: "paragraph", content: parseInline(match[2]) }],
        });
        i++;
      }
      content.push({ type: "taskList", content: items });
      continue;
    }
    // Unordered list
    else if (line.match(/^[-*] /)) {
      const items: JSONContent[] = [];
      while (i < lines.length && lines[i].match(/^[-*] /)) {
        const text = lines[i].replace(/^[-*] /, "");
        items.push({ type: "listItem", content: [{ type: "paragraph", content: parseInline(text) }] });
        i++;
      }
      content.push({ type: "bulletList", content: items });
      continue;
    }
    // Ordered list
    else if (line.match(/^\d+\. /)) {
      const items: JSONContent[] = [];
      while (i < lines.length && lines[i].match(/^\d+\. /)) {
        const text = lines[i].replace(/^\d+\. /, "");
        items.push({ type: "listItem", content: [{ type: "paragraph", content: parseInline(text) }] });
        i++;
      }
      content.push({ type: "orderedList", content: items });
      continue;
    }
    // Blockquote
    else if (line.startsWith("> ")) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].startsWith("> ")) {
        quoteLines.push(lines[i].slice(2));
        i++;
      }
      content.push({ type: "blockquote", content: [{ type: "paragraph", content: parseInline(quoteLines.join(" ")) }] });
      continue;
    }
    // Table
    else if (line.includes("|") && line.trim().startsWith("|")) {
      const tableRows: string[][] = [];
      while (i < lines.length && lines[i].includes("|") && lines[i].trim().startsWith("|")) {
        const cells = lines[i].split("|").map((c) => c.trim()).filter((c) => c !== "");
        if (!cells.every((c) => c.match(/^[-:]+$/))) {
          tableRows.push(cells);
        }
        i++;
      }
      if (tableRows.length > 0) {
        const [headerRow, ...dataRows] = tableRows;
        const tiptapRows: JSONContent[] = [
          { type: "tableRow", content: headerRow.map((cell) => ({ type: "tableHeader", content: [{ type: "paragraph", content: parseInline(cell) }] })) },
          ...dataRows.map((row) => ({ type: "tableRow", content: row.map((cell) => ({ type: "tableCell", content: [{ type: "paragraph", content: parseInline(cell) }] })) })),
        ];
        content.push({ type: "table", content: tiptapRows });
      }
      continue;
    }
    // Empty line
    else if (line.trim() === "") {
      if (content.length > 0 && content[content.length - 1].type !== "paragraph") {
        content.push({ type: "paragraph" });
      }
    }
    // Regular paragraph
    else {
      content.push({ type: "paragraph", content: parseInline(line) });
    }

    i++;
  }

  return { type: "doc", content: content.length > 0 ? content : [{ type: "paragraph" }] };
}

function parseInline(text: string): JSONContent[] {
  if (!text) return [];

  const result: JSONContent[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    const boldMatch = remaining.match(/^\*\*(.+?)\*\*/);
    if (boldMatch) {
      result.push({ type: "text", marks: [{ type: "bold" }], text: boldMatch[1] });
      remaining = remaining.slice(boldMatch[0].length);
      continue;
    }

    const italicMatch = remaining.match(/^\*(.+?)\*/);
    if (italicMatch) {
      result.push({ type: "text", marks: [{ type: "italic" }], text: italicMatch[1] });
      remaining = remaining.slice(italicMatch[0].length);
      continue;
    }

    const codeMatch = remaining.match(/^`(.+?)`/);
    if (codeMatch) {
      result.push({ type: "text", marks: [{ type: "code" }], text: codeMatch[1] });
      remaining = remaining.slice(codeMatch[0].length);
      continue;
    }

    const highlightMatch = remaining.match(/^==(.+?)==/);
    if (highlightMatch) {
      result.push({ type: "text", marks: [{ type: "highlight" }], text: highlightMatch[1] });
      remaining = remaining.slice(highlightMatch[0].length);
      continue;
    }

    const linkMatch = remaining.match(/^\[(.+?)\]\((.+?)\)/);
    if (linkMatch) {
      result.push({ type: "text", marks: [{ type: "link", attrs: { href: linkMatch[2] } }], text: linkMatch[1] });
      remaining = remaining.slice(linkMatch[0].length);
      continue;
    }

    const nextSpecial = remaining.search(/[\*`=\[]/);
    if (nextSpecial > 0) {
      result.push({ type: "text", text: remaining.slice(0, nextSpecial) });
      remaining = remaining.slice(nextSpecial);
    } else {
      result.push({ type: "text", text: remaining });
      break;
    }
  }

  return result.length > 0 ? result : [{ type: "text", text }];
}
