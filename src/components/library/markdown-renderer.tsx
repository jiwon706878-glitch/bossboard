"use client";

import { useEffect, useMemo } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { marked } from "marked";

interface Props {
  content: string;
  editable?: boolean;
  onChange?: (markdown: string) => void;
}

export function MarkdownRenderer({ content, editable = false, onChange }: Props) {
  const html = useMemo(() => {
    try {
      return marked.parse(content || "", { async: false }) as string;
    } catch {
      return content || "";
    }
  }, [content]);

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
        // v3.0 MVP: round-trip is HTML in / HTML out. Full MD round-trip lands in Week 4.
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
