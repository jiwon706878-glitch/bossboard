import { Extension } from "@tiptap/core";
import Suggestion from "@tiptap/suggestion";
import { PluginKey } from "@tiptap/pm/state";
import { SLASH_COMMANDS, type SlashCommandItem } from "./items";
import { createSlashSuggestionRenderer } from "./suggestion-renderer";

const slashPluginKey = new PluginKey("slashCommand");

export const SlashCommand = Extension.create({
  name: "slashCommand",

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        char: "/",
        pluginKey: slashPluginKey,
        startOfLine: true,
        items: ({ query }: { query: string }): SlashCommandItem[] => {
          if (!query) return SLASH_COMMANDS;
          const q = query.toLowerCase();
          return SLASH_COMMANDS.filter(
            (item) =>
              item.title.toLowerCase().includes(q) ||
              item.description.toLowerCase().includes(q)
          );
        },
        command: ({ editor, range, props }: { editor: any; range: any; props: SlashCommandItem }) => {
          editor.chain().focus().deleteRange(range).run();
          props.command(editor);
        },
        render: createSlashSuggestionRenderer,
      }),
    ];
  },
});
