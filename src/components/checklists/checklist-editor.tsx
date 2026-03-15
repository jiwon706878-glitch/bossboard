"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Placeholder from "@tiptap/extension-placeholder";
import { useImperativeHandle, forwardRef } from "react";

export interface ChecklistEditorRef {
  getItems: () => { text: string; required: boolean }[];
}

const ChecklistEditor = forwardRef<ChecklistEditorRef>(function ChecklistEditor(_props, ref) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: false,
        orderedList: false,
        listItem: false,
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({
        placeholder: "Start typing checklist items... each line becomes a checkbox",
      }),
    ],
    content: {
      type: "doc",
      content: [
        {
          type: "taskList",
          content: [
            {
              type: "taskItem",
              attrs: { checked: false },
              content: [{ type: "paragraph" }],
            },
          ],
        },
      ],
    },
    editorProps: {
      attributes: {
        class: "min-h-[300px] outline-none prose prose-sm dark:prose-invert max-w-none p-4 [&_ul[data-type=taskList]]:list-none [&_ul[data-type=taskList]]:pl-0 [&_li[data-type=taskItem]]:flex [&_li[data-type=taskItem]]:items-start [&_li[data-type=taskItem]]:gap-2 [&_li[data-type=taskItem]_label]:mt-0.5 [&_li[data-type=taskItem]_div]:flex-1 [&_li[data-type=taskItem]_p]:my-0.5",
      },
    },
  });

  useImperativeHandle(ref, () => ({
    getItems() {
      if (!editor) return [];
      const items: { text: string; required: boolean }[] = [];
      editor.state.doc.descendants((node) => {
        if (node.type.name === "taskItem") {
          const text = node.textContent.trim();
          if (text) {
            items.push({ text, required: true });
          }
        }
      });
      return items;
    },
  }), [editor]);

  return (
    <div className="rounded-md border bg-card">
      <EditorContent editor={editor} />
    </div>
  );
});

export default ChecklistEditor;
