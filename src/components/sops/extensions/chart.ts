import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { ChartBlock } from "./chart-block";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    chart: {
      insertChart: (config?: string) => ReturnType;
    };
  }
}

const DEFAULT_CONFIG = JSON.stringify({
  type: "bar",
  data: [
    { name: "Jan", value: 120 },
    { name: "Feb", value: 200 },
    { name: "Mar", value: 150 },
    { name: "Apr", value: 280 },
  ],
});

export const Chart = Node.create({
  name: "chart",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      config: { default: "" },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-chart]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes({ "data-chart": "" }, HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ChartBlock);
  },

  addCommands() {
    return {
      insertChart:
        (config?: string) =>
        ({ commands }) =>
          commands.insertContent({
            type: "chart",
            attrs: { config: config || DEFAULT_CONFIG },
          }),
    };
  },
});
