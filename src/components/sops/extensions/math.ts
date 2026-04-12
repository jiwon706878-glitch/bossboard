import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { MathBlock } from "./math-block";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    mathBlock: {
      insertMath: (latex?: string) => ReturnType;
    };
  }
}

export const MathExtension = Node.create({
  name: "mathBlock",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      latex: { default: "" },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-math]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes({ "data-math": "" }, HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MathBlock);
  },

  addCommands() {
    return {
      insertMath:
        (latex?: string) =>
        ({ commands }) =>
          commands.insertContent({
            type: "mathBlock",
            attrs: { latex: latex || "E = mc^2" },
          }),
    };
  },
});
