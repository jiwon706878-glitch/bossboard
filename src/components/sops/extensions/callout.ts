import { Node, mergeAttributes } from "@tiptap/core";

const CALLOUT_ICONS: Record<string, string> = {
  info: "💡",
  warning: "⚠️",
  success: "✅",
  danger: "🚫",
  tip: "💡",
  note: "📝",
};

export const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      type: { default: "info" },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div[data-callout]",
        getAttrs: (el) => {
          const element = el as HTMLElement;
          return { type: element.getAttribute("data-callout") || "info" };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const calloutType = HTMLAttributes.type || "info";
    const icon = CALLOUT_ICONS[calloutType] || "💡";
    return [
      "div",
      mergeAttributes({
        "data-callout": calloutType,
        class: `callout callout-${calloutType}`,
      }),
      ["span", { class: "callout-icon", contenteditable: "false" }, icon],
      ["div", { class: "callout-content" }, 0],
    ];
  },
});
