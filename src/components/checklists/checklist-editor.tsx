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
        emptyNodeClass: "is-empty",
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
    <>
      <style>{`
        .checklist-editor ul[data-type="taskList"] {
          list-style: none !important;
          padding: 0 !important;
          margin: 0 !important;
        }
        .checklist-editor li[data-type="taskItem"] {
          display: flex !important;
          flex-direction: row !important;
          align-items: flex-start !important;
          gap: 8px !important;
          padding: 4px 0 !important;
          margin: 0 !important;
        }
        .checklist-editor li[data-type="taskItem"] > label {
          display: inline-flex !important;
          align-items: center !important;
          flex-shrink: 0 !important;
          margin-top: 2px !important;
          cursor: pointer !important;
          user-select: none !important;
        }
        .checklist-editor li[data-type="taskItem"] > label > input[type="checkbox"] {
          appearance: none !important;
          -webkit-appearance: none !important;
          width: 18px !important;
          height: 18px !important;
          border: 2px solid var(--border) !important;
          border-radius: 5px !important;
          background: transparent !important;
          cursor: pointer !important;
          position: relative !important;
          flex-shrink: 0 !important;
          transition: all 0.15s ease !important;
        }
        .checklist-editor li[data-type="taskItem"] > label > input[type="checkbox"]:hover {
          border-color: var(--primary) !important;
        }
        .checklist-editor li[data-type="taskItem"] > label > input[type="checkbox"]:checked {
          background: var(--primary) !important;
          border-color: var(--primary) !important;
        }
        .checklist-editor li[data-type="taskItem"] > label > input[type="checkbox"]:checked::after {
          content: "" !important;
          position: absolute !important;
          left: 4px !important;
          top: 1px !important;
          width: 6px !important;
          height: 10px !important;
          border: solid white !important;
          border-width: 0 2px 2px 0 !important;
          transform: rotate(45deg) !important;
        }
        .checklist-editor li[data-type="taskItem"] > div {
          flex: 1 !important;
          min-width: 0 !important;
          line-height: 1.6 !important;
        }
        .checklist-editor li[data-type="taskItem"] > div p {
          margin: 0 !important;
        }
        .checklist-editor li[data-type="taskItem"][data-checked="true"] > div {
          text-decoration: line-through !important;
          opacity: 0.5 !important;
        }
        .checklist-editor ul[data-type="taskList"] ul[data-type="taskList"] {
          padding-left: 28px !important;
        }
        .checklist-editor .is-empty::before {
          content: attr(data-placeholder);
          color: var(--muted-foreground);
          opacity: 0.4;
          float: left;
          height: 0;
          pointer-events: none;
        }
      `}</style>
      <div className="checklist-editor rounded-md border bg-card overflow-hidden">
        <EditorContent editor={editor} />
      </div>
    </>
  );
});

export default ChecklistEditor;
