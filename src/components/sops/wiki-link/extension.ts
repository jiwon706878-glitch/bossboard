import { Node, mergeAttributes } from "@tiptap/core";
import { type SuggestionOptions } from "@tiptap/suggestion";
import Suggestion from "@tiptap/suggestion";

export interface WikiLinkOptions {
  suggestion: Partial<SuggestionOptions>;
  onNavigate?: (docId: string) => void;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    wikiLink: {
      insertWikiLink: (attrs: { docId: string; docTitle: string }) => ReturnType;
    };
  }
}

export const WikiLink = Node.create<WikiLinkOptions>({
  name: "wikiLink",
  group: "inline",
  inline: true,
  atom: true,

  addOptions() {
    return {
      suggestion: {
        char: "[[",
        pluginKey: undefined as unknown as any,
        command: ({ editor, range, props }) => {
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .insertWikiLink({ docId: props.id, docTitle: props.title })
            .run();
        },
      },
      onNavigate: undefined,
    };
  },

  addAttributes() {
    return {
      docId: { default: null },
      docTitle: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-wiki-link]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-wiki-link": "",
        "data-doc-id": HTMLAttributes.docId,
        class: "wiki-link",
      }),
      `📄 ${HTMLAttributes.docTitle || "Unknown"}`,
    ];
  },

  addCommands() {
    return {
      insertWikiLink:
        (attrs) =>
        ({ chain }) => {
          return chain().insertContent({ type: this.name, attrs }).run();
        },
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
});
