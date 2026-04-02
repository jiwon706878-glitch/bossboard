import { Node, mergeAttributes } from "@tiptap/core";

export const Details = Node.create({
  name: "details",
  group: "block",
  content: "detailsSummary detailsContent",
  defining: true,

  parseHTML() {
    return [{ tag: "details.toggle-block" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["details", mergeAttributes(HTMLAttributes, { class: "toggle-block", open: true }), 0];
  },

  addKeyboardShortcuts() {
    return {
      "Mod-Shift-t": () =>
        this.editor
          .chain()
          .focus()
          .insertContent({
            type: "details",
            content: [
              { type: "detailsSummary", content: [{ type: "text", text: "Toggle heading" }] },
              { type: "detailsContent", content: [{ type: "paragraph" }] },
            ],
          })
          .run(),
    };
  },
});

export const DetailsSummary = Node.create({
  name: "detailsSummary",
  content: "inline*",
  defining: true,

  parseHTML() {
    return [{ tag: "summary.toggle-summary" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["summary", mergeAttributes(HTMLAttributes, { class: "toggle-summary" }), 0];
  },
});

export const DetailsContent = Node.create({
  name: "detailsContent",
  content: "block+",
  defining: true,

  parseHTML() {
    return [{ tag: "div[data-details-content]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-details-content": "", class: "toggle-content" }), 0];
  },
});
