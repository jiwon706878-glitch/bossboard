"use client";

import { useEffect, useMemo } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { marked } from "marked";
import { convertFileSrc } from "@tauri-apps/api/core";
import { isTauri } from "@/lib/tauri/fs";

interface Props {
  content: string;
  editable?: boolean;
  onChange?: (markdown: string) => void;
  /**
   * Absolute path to the file's directory. When provided, relative image refs
   * (`![](folder.assets/img.png)`) are rewritten to Tauri's asset:// URL so
   * local images render in the WebView.
   */
  basePath?: string;
}

const ABSOLUTE_URL = /^([a-z][a-z0-9+\-.]*:|\/\/|data:)/i;

function rewriteImageRefs(markdown: string, basePath: string | undefined): string {
  if (!basePath || !isTauri()) return markdown;
  return markdown.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (full, alt, src) => {
    const trimmed = (src as string).trim();
    if (ABSOLUTE_URL.test(trimmed)) return full;
    const abs = `${basePath.replace(/[\\/]+$/, "")}/${trimmed.replace(/^[\\/]+/, "")}`;
    try {
      return `![${alt}](${convertFileSrc(abs)})`;
    } catch {
      return full;
    }
  });
}

export function MarkdownRenderer({ content, editable = false, onChange, basePath }: Props) {
  const html = useMemo(() => {
    try {
      return marked.parse(rewriteImageRefs(content || "", basePath), {
        async: false,
      }) as string;
    } catch {
      return content || "";
    }
  }, [content, basePath]);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: true }),
      Image,
      TaskList,
      TaskItem.configure({ nested: true }),
    ],
    content: html,
    editable,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      if (onChange) {
        onChange(editor.getHTML());
      }
    },
    editorProps: {
      attributes: {
        class: "prose prose-invert max-w-none focus:outline-none min-h-[60vh]",
      },
    },
  });

  useEffect(() => {
    if (editor && !editable) {
      editor.commands.setContent(html);
    }
  }, [html, editor, editable]);

  return <EditorContent editor={editor} />;
}
