import { ReactRenderer } from "@tiptap/react";
import type { SuggestionProps, SuggestionKeyDownProps } from "@tiptap/suggestion";
import { SuggestionList } from "./suggestion";

interface RendererState {
  component: ReactRenderer;
  container: HTMLDivElement;
}

export function createSuggestionRenderer() {
  let state: RendererState | null = null;

  function updatePosition(clientRect: (() => DOMRect | null) | null | undefined) {
    if (!state || !clientRect) return;
    const rect = clientRect();
    if (!rect) return;
    state.container.style.left = `${rect.left}px`;
    state.container.style.top = `${rect.bottom + 4}px`;
  }

  function cleanup() {
    if (state) {
      state.component.destroy();
      state.container.remove();
      state = null;
    }
  }

  return {
    onStart(props: SuggestionProps) {
      const container = document.createElement("div");
      container.style.position = "fixed";
      container.style.zIndex = "50";
      document.body.appendChild(container);

      const component = new ReactRenderer(SuggestionList, {
        props,
        editor: props.editor,
      });

      container.appendChild(component.element as HTMLElement);
      state = { component, container };
      updatePosition(props.clientRect);
    },

    onUpdate(props: SuggestionProps) {
      state?.component.updateProps(props);
      updatePosition(props.clientRect);
    },

    onKeyDown(props: SuggestionKeyDownProps): boolean {
      if (props.event.key === "Escape") {
        cleanup();
        return true;
      }
      return (state?.component.ref as any)?.onKeyDown?.(props) ?? false;
    },

    onExit() {
      cleanup();
    },
  };
}
