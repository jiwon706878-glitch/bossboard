import { Node, mergeAttributes } from "@tiptap/core";

export const FootnoteRef = Node.create({
  name: "footnoteRef",
  group: "inline",
  inline: true,
  atom: true,

  addAttributes() {
    return {
      noteId: { default: null },
      noteContent: { default: "" },
      noteUrl: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: "sup[data-footnote]" }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const noteId = node.attrs.noteId || "1";
    return [
      "sup",
      mergeAttributes(HTMLAttributes, {
        "data-footnote": noteId,
        class: "footnote-ref",
        title: node.attrs.noteContent || "",
      }),
      `[${noteId}]`,
    ];
  },
});
