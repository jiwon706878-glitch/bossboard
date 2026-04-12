"use client";

import { useState, useCallback } from "react";
import { useEditor, EditorContent, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Highlight from "@tiptap/extension-highlight";
import Underline from "@tiptap/extension-underline";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import LinkExtension from "@tiptap/extension-link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Highlighter,
  Undo,
  Redo,
  Table2,
  Code,
  Minus,
  Link2,
  GitBranch,
  BarChart3,
  Sigma,
} from "lucide-react";
import { WikiLink } from "./wiki-link/extension";
import { createSuggestionItems } from "./wiki-link/suggestion";
import { createSuggestionRenderer } from "./wiki-link/suggestion-renderer";
import { SlashCommand } from "./slash-command/extension";
import { Details, DetailsSummary, DetailsContent } from "./extensions/toggle-block";
import { Callout } from "./extensions/callout";
import { FootnoteRef } from "./extensions/footnote";
import { Mermaid } from "./extensions/mermaid";
import { Chart } from "./extensions/chart";
import { MathExtension } from "./extensions/math";

interface SOPEditorProps {
  content?: JSONContent | null;
  onChange?: (content: JSONContent) => void;
  editable?: boolean;
  businessId?: string;
  onNavigate?: (docId: string) => void;
}

function ToolbarButton({
  onClick,
  isActive,
  children,
  title,
}: {
  onClick: () => void;
  isActive?: boolean;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={cn(
        "h-8 w-8 p-0 transition-colors duration-150",
        isActive
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:text-foreground"
      )}
      onClick={onClick}
      title={title}
    >
      {children}
    </Button>
  );
}

export function SOPEditor({ content, onChange, editable = true, businessId, onNavigate }: SOPEditorProps) {
  const [tablePopoverOpen, setTablePopoverOpen] = useState(false);
  const [hoverRow, setHoverRow] = useState(0);
  const [hoverCol, setHoverCol] = useState(0);
  const [tableCtx, setTableCtx] = useState<{ x: number; y: number } | null>(null);
  const [emojiTab, setEmojiTab] = useState<"emoji" | "symbols">("emoji");
  const [bubblePos, setBubblePos] = useState<{ x: number; y: number } | null>(null);

  const updateBubble = useCallback(() => {
    if (!editable) return;
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) {
      setBubblePos(null);
      return;
    }
    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    if (rect.width === 0) { setBubblePos(null); return; }
    setBubblePos({ x: rect.left + rect.width / 2, y: rect.top - 8 });
  }, [editable]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder: "Start writing... Type [[ to link documents.",
      }),
      Highlight.configure({}),
      Underline.configure({}),
      TaskList.configure({}),
      TaskItem.configure({
        nested: true,
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: { class: "border-collapse w-full" },
      }),
      TableRow,
      TableCell,
      TableHeader,
      LinkExtension.configure({
        openOnClick: true,
        HTMLAttributes: {
          class: "text-primary underline",
          target: "_blank",
          rel: "noopener noreferrer",
        },
      }),
      Details,
      DetailsSummary,
      DetailsContent,
      Callout,
      FootnoteRef,
      Mermaid,
      Chart,
      MathExtension,
      SlashCommand,
      WikiLink.configure({
        suggestion: {
          items: createSuggestionItems(businessId),
          render: createSuggestionRenderer,
        },
        onNavigate,
      }),
    ],
    content: content || undefined,
    editable,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getJSON());
    },
    onSelectionUpdate: () => {
      setTimeout(updateBubble, 0);
    },
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-sm dark:prose-invert max-w-none min-h-[300px] px-4 py-3 focus:outline-none text-foreground",
          "[&_ul[data-type=taskList]]:list-none [&_ul[data-type=taskList]]:pl-0",
          "[&_ul[data-type=taskList]_li]:flex [&_ul[data-type=taskList]_li]:items-start [&_ul[data-type=taskList]_li]:gap-2",
          "[&_ul[data-type=taskList]_li_label]:mt-0.5",
        ),
      },
      handleDOMEvents: {
        contextmenu: (_view, event) => {
          const target = event.target as HTMLElement;
          if (editable && (target.closest("td") || target.closest("th"))) {
            event.preventDefault();
            setTableCtx({ x: event.clientX, y: event.clientY });
            return true;
          }
          return false;
        },
      },
      handleClick: (_view, _pos, event) => {
        const target = event.target as HTMLElement;
        const wikiLink = target.closest("[data-wiki-link]");
        if (wikiLink && !editable) {
          const docId = wikiLink.getAttribute("data-doc-id");
          if (docId && onNavigate) {
            event.preventDefault();
            onNavigate(docId);
            return true;
          }
        }
        return false;
      },
    },
  });

  if (!editor) return null;

  return (
    <div className="rounded-md border bg-card">
      {/* Editor styles */}
      <style>{`
        .wiki-link {
          color: var(--primary);
          text-decoration: underline;
          text-decoration-style: dotted;
          text-underline-offset: 2px;
          cursor: pointer;
          border-radius: 2px;
          padding: 0 2px;
          transition: background-color 0.1s;
        }
        .wiki-link:hover {
          background-color: color-mix(in srgb, var(--primary) 10%, transparent);
        }
        .wiki-link[data-broken="true"] {
          color: var(--destructive);
          text-decoration-color: var(--destructive);
        }
        /* Lists */
        .prose ol { list-style-type: decimal; padding-left: 1.5em; }
        .prose ul:not([data-type="taskList"]) { list-style-type: disc; padding-left: 1.5em; }
        .prose ol li, .prose ul:not([data-type="taskList"]) li { margin-top: 0.25em; margin-bottom: 0.25em; }
        .prose li > ol { list-style-type: lower-alpha; }
        .prose li > ul:not([data-type="taskList"]) { list-style-type: circle; }
        /* Numbered list alignment */
        .prose ol { font-variant-numeric: tabular-nums; }
        /* Headings — clear visual hierarchy */
        .prose h1 { font-size: 1.75em; font-weight: 700; margin-top: 1.2em; margin-bottom: 0.5em; letter-spacing: -0.02em; border-bottom: 1px solid var(--border); padding-bottom: 0.3em; }
        .prose h2 { font-size: 1.35em; font-weight: 600; margin-top: 1em; margin-bottom: 0.4em; letter-spacing: -0.01em; }
        .prose h3 { font-size: 1.1em; font-weight: 600; margin-top: 0.8em; margin-bottom: 0.3em; }
        /* Tables */
        .prose table { border-collapse: collapse; width: 100%; margin: 1em 0; }
        .prose th { background-color: var(--muted); font-weight: 500; text-align: left; }
        .prose th, .prose td { border: 1px solid var(--border); padding: 0.5em 0.75em; font-size: 0.875rem; vertical-align: top; min-width: 80px; }
        .prose td p, .prose th p { margin: 0; }
        .prose tr:hover td { background-color: color-mix(in srgb, var(--muted) 30%, transparent); }
        .prose .selectedCell { background-color: color-mix(in srgb, var(--primary) 8%, transparent); }
        .prose .column-resize-handle { position: absolute; right: -2px; top: 0; bottom: 0; width: 4px; background-color: var(--primary); cursor: col-resize; }
        .tableWrapper { overflow-x: auto; }
        /* Code blocks */
        .prose pre { background-color: var(--muted); border-radius: 6px; padding: 0.75em 1em; overflow-x: auto; }
        .prose pre code { background: none; padding: 0; font-size: 0.85em; }
        .prose code { background-color: var(--muted); border-radius: 3px; padding: 0.15em 0.3em; font-size: 0.85em; }
        /* Toggle blocks */
        .prose details.toggle-block { border: 1px solid var(--border); border-radius: 6px; margin: 0.75em 0; overflow: hidden; }
        .prose details.toggle-block summary.toggle-summary { cursor: pointer; padding: 0.5em 0.75em; font-weight: 500; background: var(--muted); list-style: none; display: flex; align-items: center; gap: 0.5em; }
        .prose details.toggle-block summary.toggle-summary::before { content: "▶"; font-size: 0.7em; transition: transform 0.2s; }
        .prose details.toggle-block[open] summary.toggle-summary::before { transform: rotate(90deg); }
        .prose details.toggle-block .toggle-content { padding: 0.5em 0.75em; }
        /* Callouts */
        .prose .callout { display: flex; gap: 0.75em; border-radius: 6px; padding: 0.75em 1em; margin: 0.75em 0; border-left: 3px solid; }
        .prose .callout-icon { font-size: 1.1em; line-height: 1.5; flex-shrink: 0; }
        .prose .callout-content { flex: 1; min-width: 0; }
        .prose .callout-content p { margin: 0; }
        .prose .callout-info { background: color-mix(in srgb, #3b82f6 8%, transparent); border-color: #3b82f6; }
        .prose .callout-warning { background: color-mix(in srgb, #f59e0b 8%, transparent); border-color: #f59e0b; }
        .prose .callout-success { background: color-mix(in srgb, #10b981 8%, transparent); border-color: #10b981; }
        .prose .callout-danger { background: color-mix(in srgb, #ef4444 8%, transparent); border-color: #ef4444; }
        .prose .callout-tip { background: color-mix(in srgb, #8b5cf6 8%, transparent); border-color: #8b5cf6; }
        .prose .callout-note { background: color-mix(in srgb, #6b7280 8%, transparent); border-color: #6b7280; }
        /* Links */
        .prose a.text-primary { color: var(--primary); }
        /* Footnotes */
        .prose .footnote-ref { color: var(--primary); cursor: default; font-size: 0.75em; vertical-align: super; padding: 0 1px; font-weight: 600; }
        .prose .footnote-ref:hover { text-decoration: underline; }
        /* Power-up blocks */
        .prose .mermaid-block, .prose .chart-block, .prose .math-block { margin: 0.75em 0; }
        .prose .mermaid-block .node rect, .prose .mermaid-block .node circle, .prose .mermaid-block .node polygon { fill: var(--muted) !important; stroke: var(--border) !important; }
        .prose .mermaid-block .edgeLabel { background-color: var(--bg-secondary, #141824) !important; }
        .prose .mermaid-block text { fill: var(--text-primary, #E8ECF4) !important; }
      `}</style>

      {editable && (
        <div className="flex flex-wrap items-center gap-0.5 border-b bg-muted/50 px-2 py-1.5">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive("bold")}
            title="Bold"
          >
            <Bold className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive("italic")}
            title="Italic"
          >
            <Italic className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            isActive={editor.isActive("underline")}
            title="Underline"
          >
            <UnderlineIcon className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHighlight().run()}
            isActive={editor.isActive("highlight")}
            title="Highlight"
          >
            <Highlighter className="h-4 w-4" />
          </ToolbarButton>

          <div className="mx-1 h-5 w-px bg-border" />

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            isActive={editor.isActive("heading", { level: 1 })}
            title="Heading 1"
          >
            <Heading1 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            isActive={editor.isActive("heading", { level: 2 })}
            title="Heading 2"
          >
            <Heading2 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            isActive={editor.isActive("heading", { level: 3 })}
            title="Heading 3"
          >
            <Heading3 className="h-4 w-4" />
          </ToolbarButton>

          <div className="mx-1 h-5 w-px bg-border" />

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            isActive={editor.isActive("bulletList")}
            title="Bullet List"
          >
            <List className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            isActive={editor.isActive("orderedList")}
            title="Ordered List"
          >
            <ListOrdered className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            isActive={editor.isActive("taskList")}
            title="Task List"
          >
            <CheckSquare className="h-4 w-4" />
          </ToolbarButton>

          <div className="mx-1 h-5 w-px bg-border" />

          <Popover open={tablePopoverOpen} onOpenChange={setTablePopoverOpen}>
            <PopoverTrigger asChild>
              <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground" title="Insert Table">
                <Table2 className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2" align="start">
              <p className="text-xs text-muted-foreground mb-2">{hoverRow > 0 ? `${hoverRow} × ${hoverCol}` : "Select size"}</p>
              <div className="grid gap-0.5" style={{ gridTemplateColumns: "repeat(6, 1fr)" }}>
                {Array.from({ length: 36 }, (_, i) => {
                  const r = Math.floor(i / 6);
                  const c = i % 6;
                  return (
                    <button
                      key={i}
                      type="button"
                      className={cn(
                        "h-4 w-4 rounded-sm border transition-colors",
                        r < hoverRow && c < hoverCol ? "bg-primary/30 border-primary/50" : "bg-muted/50 border-border"
                      )}
                      onMouseEnter={() => { setHoverRow(r + 1); setHoverCol(c + 1); }}
                      onClick={() => {
                        editor.chain().focus().insertTable({ rows: r + 1, cols: c + 1, withHeaderRow: true }).run();
                        setTablePopoverOpen(false);
                        setHoverRow(0);
                        setHoverCol(0);
                      }}
                    />
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            isActive={editor.isActive("codeBlock")}
            title="Code Block"
          >
            <Code className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            title="Divider"
          >
            <Minus className="h-4 w-4" />
          </ToolbarButton>

          <div className="mx-1 h-5 w-px bg-border" />

          <Popover>
            <PopoverTrigger asChild>
              <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground" title="Emoji & Symbols">
                <span className="text-sm">☺</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-3" align="start">
              <div className="flex gap-1 rounded-md bg-muted p-0.5 mb-2">
                <button type="button" className={cn("flex-1 rounded px-2 py-1 text-xs font-medium transition-colors", emojiTab === "emoji" ? "bg-card shadow-sm" : "text-muted-foreground")} onClick={() => setEmojiTab("emoji")}>Emoji</button>
                <button type="button" className={cn("flex-1 rounded px-2 py-1 text-xs font-medium transition-colors", emojiTab === "symbols" ? "bg-card shadow-sm" : "text-muted-foreground")} onClick={() => setEmojiTab("symbols")}>Symbols</button>
              </div>
              {emojiTab === "emoji" ? (
                <div className="grid grid-cols-8 gap-1">
                  {["😀","😂","🥰","😎","🤔","😅","🙏","👍","👎","❤️","⭐","✅","❌","⚠️","💡","📌","📝","🔥","🎯","🏆","📊","📈","🔧","💰","📅","🕐","📞","📧","🏠","🚀","✨","🎉","👀","💬","🤝","💪","🎵","📷","🌟","⚡"].map((e) => (
                    <button key={e} type="button" className="flex h-8 w-8 items-center justify-center rounded hover:bg-muted text-lg" onClick={() => editor.chain().focus().insertContent(e).run()}>{e}</button>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-8 gap-1">
                  {["→","←","↑","↓","↔","⇒","⇐","⇔","★","☆","●","○","■","□","▶","◀","©","®","™","°","±","×","÷","≈","≠","≤","≥","∞","√","∑","∆","π","€","£","¥","₩","½","¼","¾","✓","✗","†","‡","§","¶","•","…","—","–"].map((s) => (
                    <button key={s} type="button" className="flex h-8 w-8 items-center justify-center rounded hover:bg-muted text-sm font-mono" onClick={() => editor.chain().focus().insertContent(s).run()}>{s}</button>
                  ))}
                </div>
              )}
              <p className="text-[10px] text-muted-foreground mt-2">Tip: Press Win+. for full emoji picker</p>
            </PopoverContent>
          </Popover>

          <div className="mx-1 h-5 w-px bg-border" />

          <ToolbarButton
            onClick={() => editor.chain().focus().insertMermaid().run()}
            title="Mermaid Diagram"
          >
            <GitBranch className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().insertChart().run()}
            title="Chart"
          >
            <BarChart3 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().insertMath().run()}
            title="Math Equation"
          >
            <Sigma className="h-4 w-4" />
          </ToolbarButton>

          <div className="mx-1 h-5 w-px bg-border" />

          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            title="Undo"
          >
            <Undo className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            title="Redo"
          >
            <Redo className="h-4 w-4" />
          </ToolbarButton>
        </div>
      )}
      <EditorContent editor={editor} />

      {editable && editor && bubblePos && (
        <div
          className="fixed z-50 flex items-center gap-0.5 rounded-md border bg-popover p-1 shadow-md -translate-x-1/2 -translate-y-full"
          style={{ left: bubblePos.x, top: bubblePos.y }}
          onMouseDown={(e) => e.preventDefault()}
        >
          <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive("bold")} title="Bold">
            <Bold className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive("italic")} title="Italic">
            <Italic className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={editor.isActive("underline")} title="Underline">
            <UnderlineIcon className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleHighlight().run()} isActive={editor.isActive("highlight")} title="Highlight">
            <Highlighter className="h-3.5 w-3.5" />
          </ToolbarButton>
          <div className="mx-0.5 h-4 w-px bg-border" />
          <ToolbarButton
            onClick={() => {
              const url = window.prompt("Enter URL (or /dashboard/... for internal link):");
              if (url) {
                if (url.startsWith("/dashboard")) {
                  editor.chain().focus().setLink({ href: url, target: null }).run();
                } else {
                  editor.chain().focus().setLink({ href: url, target: "_blank" }).run();
                }
              } else {
                editor.chain().focus().unsetLink().run();
              }
            }}
            isActive={editor.isActive("link")}
            title="Link"
          >
            <Link2 className="h-3.5 w-3.5" />
          </ToolbarButton>
        </div>
      )}

      {tableCtx && editable && (
        <>
          <div className="fixed inset-0 z-50" onClick={() => setTableCtx(null)} />
          <div
            className="fixed z-[60] w-48 rounded-md border bg-popover p-1 shadow-md text-popover-foreground"
            style={{ left: Math.min(tableCtx.x, typeof window !== "undefined" ? window.innerWidth - 210 : 0), top: Math.min(tableCtx.y, typeof window !== "undefined" ? window.innerHeight - 300 : 0) }}
          >
            <p className="px-3 py-1 text-[10px] text-muted-foreground uppercase tracking-wide">Table</p>
            {[
              { label: "Add row above", action: () => editor.chain().focus().addRowBefore().run() },
              { label: "Add row below", action: () => editor.chain().focus().addRowAfter().run() },
              { label: "Add column left", action: () => editor.chain().focus().addColumnBefore().run() },
              { label: "Add column right", action: () => editor.chain().focus().addColumnAfter().run() },
            ].map((item) => (
              <button key={item.label} type="button" className="flex w-full items-center rounded-sm px-3 py-1.5 text-xs hover:bg-muted" onClick={() => { item.action(); setTableCtx(null); }}>
                {item.label}
              </button>
            ))}
            <div className="my-1 border-t" />
            {[
              { label: "Merge cells", action: () => editor.chain().focus().mergeCells().run() },
              { label: "Split cell", action: () => editor.chain().focus().splitCell().run() },
              { label: "Toggle header row", action: () => editor.chain().focus().toggleHeaderRow().run() },
            ].map((item) => (
              <button key={item.label} type="button" className="flex w-full items-center rounded-sm px-3 py-1.5 text-xs hover:bg-muted" onClick={() => { item.action(); setTableCtx(null); }}>
                {item.label}
              </button>
            ))}
            <div className="my-1 border-t" />
            {[
              { label: "Delete row", action: () => editor.chain().focus().deleteRow().run() },
              { label: "Delete column", action: () => editor.chain().focus().deleteColumn().run() },
              { label: "Delete table", action: () => editor.chain().focus().deleteTable().run() },
            ].map((item) => (
              <button key={item.label} type="button" className="flex w-full items-center rounded-sm px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10" onClick={() => { item.action(); setTableCtx(null); }}>
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
