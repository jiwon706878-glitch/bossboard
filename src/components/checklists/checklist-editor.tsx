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
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        bulletList: false,
        orderedList: false,
        listItem: false,
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({
        placeholder: "Type a checklist item and press Enter...",
        emptyNodeClass: "before:text-muted-foreground/40 before:content-[attr(data-placeholder)] before:float-left before:h-0 before:pointer-events-none",
      }),
    ],
    content: '<ul data-type="taskList"><li data-type="taskItem" data-checked="false"><p></p></li></ul>',
    editorProps: {
      attributes: {
        class: "min-h-[300px] max-w-none p-4 text-sm focus:outline-none",
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

  if (!editor) {
    return <div className="min-h-[300px] rounded-md border bg-card p-4 text-sm text-muted-foreground">Loading editor...</div>;
  }

  return (
    <div className="rounded-md border bg-card overflow-hidden">
      <EditorContent editor={editor} />
    </div>
  );
});

export default ChecklistEditor;
