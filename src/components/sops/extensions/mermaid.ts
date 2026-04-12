import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { MermaidBlock } from "./mermaid-block";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    mermaid: {
      insertMermaid: (code?: string) => ReturnType;
    };
  }
}

export const Mermaid = Node.create({
  name: "mermaid",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      code: { default: "" },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-mermaid]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes({ "data-mermaid": "" }, HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MermaidBlock);
  },

  addCommands() {
    return {
      insertMermaid:
        (code?: string) =>
        ({ commands }) =>
          commands.insertContent({
            type: "mermaid",
            attrs: { code: code || "graph TD;\n  A-->B;\n  B-->C;" },
          }),
    };
  },
});
