import type { Metadata } from "next";
import Link from "next/link";
import {
  Rocket,
  KeyRound,
  Bot,
  BookOpen,
  Plug,
  ArrowRight,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Docs — BossBoard",
  description:
    "Get started with BossBoard, set up BYOK, build agents, organize the Library, and connect MCP clients.",
};

const SECTIONS = [
  {
    href: "/docs/getting-started",
    icon: Rocket,
    title: "Getting started",
    description:
      "Download, install, pick a workspace folder, create your first agent.",
  },
  {
    href: "/docs/byok",
    icon: KeyRound,
    title: "Bring your own AI key",
    description:
      "Get keys from Google, Anthropic, OpenAI, xAI, or run local Ollama.",
  },
  {
    href: "/docs/agents",
    icon: Bot,
    title: "Building agents",
    description:
      "Manuals, memory, conversations, and how to wire a domain specialist.",
  },
  {
    href: "/docs/library",
    icon: BookOpen,
    title: "Library",
    description:
      "Markdown + frontmatter, drag-drop attachments, search, format warnings.",
  },
  {
    href: "/docs/mcp",
    icon: Plug,
    title: "MCP",
    description:
      "Connect Claude Code, Cursor, or your own client to the local MCP server.",
  },
];

export default function DocsHub() {
  return (
    <main className="py-20 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-10">
          <h1 className="text-4xl font-bold mb-3">Documentation</h1>
          <p className="text-muted-foreground">
            BossBoard is a local-first AI workspace. Five guides cover the
            essentials — pick where you are.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            return (
              <Link
                key={s.href}
                href={s.href}
                className="group rounded-xl border border-border p-5 hover:border-primary transition flex items-start gap-4"
              >
                <div className="size-10 rounded-lg bg-primary/10 grid place-items-center text-primary shrink-0">
                  <Icon className="size-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium flex items-center gap-1">
                    {s.title}
                    <ArrowRight className="size-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {s.description}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="mt-12 rounded-lg border-l-4 border-primary bg-primary/5 p-4 text-sm">
          <p className="font-medium mb-1">Need something not here?</p>
          <p className="text-muted-foreground">
            Email{" "}
            <a
              href="mailto:jay@mybossboard.com"
              className="text-primary hover:underline"
            >
              jay@mybossboard.com
            </a>{" "}
            — solo build, 24h response. Beta is the time to ask for what you
            need.
          </p>
        </div>
      </div>
    </main>
  );
}
