"use client";

import { useEffect, useMemo } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { Markdown } from "tiptap-markdown";
import { rewriteMarkdownImages } from "@/lib/library/image-resolver";

interface Props {
  content: string;
  editable?: boolean;
  onChange?: (markdown: string) => void;
  /** Absolute path to the directory of the source file (used to resolve relative image refs). */
  basePath?: string;
}

interface MarkdownStorage {
  markdown: { getMarkdown: () => string };
}

export function MarkdownRenderer({ content, editable = false, onChange, basePath }: Props) {
  const resolved = useMemo(
    () => rewriteMarkdownImages(content || "", basePath),
    [content, basePath],
  );

  const editor = useEditor({
    extensions: [
      StarterKit,
      Markdown.configure({
        html: false,
        tightLists: true,
        bulletListMarker: "-",
        linkify: true,
      }),
      Link.configure({ openOnClick: true }),
      Image,
      TaskList,
      TaskItem.configure({ nested: true }),
    ],
    content: resolved,
    editable,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      if (onChange) {
        const storage = editor.storage as unknown as MarkdownStorage;
        const md = storage.markdown?.getMarkdown?.() ?? editor.getHTML();
        onChange(md);
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
      editor.commands.setContent(resolved);
    }
  }, [resolved, editor, editable]);

  return <EditorContent editor={editor} />;
}
