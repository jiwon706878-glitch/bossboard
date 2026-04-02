import type { Editor } from "@tiptap/core";

export interface SlashCommandItem {
  title: string;
  description: string;
  icon: string;
  command: (editor: Editor) => void;
}

export const SLASH_COMMANDS: SlashCommandItem[] = [
  {
    title: "Heading 1",
    description: "Large section heading",
    icon: "H₁",
    command: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    title: "Heading 2",
    description: "Medium section heading",
    icon: "H₂",
    command: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    title: "Heading 3",
    description: "Small section heading",
    icon: "H₃",
    command: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run(),
  },
  {
    title: "Bullet List",
    description: "Unordered list",
    icon: "•",
    command: (editor) => editor.chain().focus().toggleBulletList().run(),
  },
  {
    title: "Numbered List",
    description: "Ordered list",
    icon: "1.",
    command: (editor) => editor.chain().focus().toggleOrderedList().run(),
  },
  {
    title: "Task List",
    description: "Checklist with checkboxes",
    icon: "☑",
    command: (editor) => editor.chain().focus().toggleTaskList().run(),
  },
  {
    title: "Table",
    description: "Insert a 3×3 table",
    icon: "▦",
    command: (editor) => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
  },
  {
    title: "Code Block",
    description: "Formatted code snippet",
    icon: "<>",
    command: (editor) => editor.chain().focus().toggleCodeBlock().run(),
  },
  {
    title: "Divider",
    description: "Horizontal separator line",
    icon: "—",
    command: (editor) => editor.chain().focus().setHorizontalRule().run(),
  },
  {
    title: "Blockquote",
    description: "Quoted text block",
    icon: "❝",
    command: (editor) => editor.chain().focus().toggleBlockquote().run(),
  },
  {
    title: "Callout",
    description: "Info callout box",
    icon: "💡",
    command: (editor) => editor.chain().focus().insertContent({ type: "callout", attrs: { type: "info" }, content: [{ type: "paragraph" }] }).run(),
  },
  {
    title: "Toggle",
    description: "Collapsible section",
    icon: "▶",
    command: (editor) => {
      const title = window.prompt("Toggle title:") || "Click to expand";
      editor.chain().focus().insertContent({
        type: "details",
        content: [
          { type: "detailsSummary", content: [{ type: "text", text: title }] },
          { type: "detailsContent", content: [{ type: "paragraph" }] },
        ],
      }).run();
    },
  },
  {
    title: "Footnote",
    description: "Add a reference [1]",
    icon: "¹",
    command: (editor) => {
      const json = editor.getJSON();
      const countFootnotes = (node: any): number => {
        let c = node.type === "footnoteRef" ? 1 : 0;
        if (node.content) for (const child of node.content) c += countFootnotes(child);
        return c;
      };
      const existing = json.content?.reduce((s: number, n: any) => s + countFootnotes(n), 0) || 0;
      const noteNumber = existing + 1;
      const noteContent = window.prompt("Footnote text:");
      if (noteContent) {
        editor.chain().focus().insertContent({
          type: "footnoteRef",
          attrs: { noteId: String(noteNumber), noteContent, noteUrl: null },
        }).run();
      }
    },
  },
];
