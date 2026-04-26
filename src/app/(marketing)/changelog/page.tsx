import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Changelog — BossBoard",
  description: "Release notes for BossBoard.",
};

interface Release {
  version: string;
  date: string;
  status: "released" | "preview";
  added?: string[];
  changed?: string[];
  fixed?: string[];
  knownIssues?: string[];
}

const RELEASES: Release[] = [
  {
    version: "v0.1.0",
    date: "Beta — TBD launch date",
    status: "preview",
    added: [
      "Local-first AI workspace (Tauri + Next.js)",
      "Library with 3-mode markdown editor (source / live / preview)",
      "AI Agents with persistent manuals + memory",
      "BYOK: Google Gemini, Anthropic Claude, OpenAI, xAI Grok, local Ollama",
      "Multi-key-per-provider with per-agent key pin (ai_key_id)",
      "Direct Messages with agents — Telegram-style sliding panel",
      "Smart typing indicator (3s dots / 15s thinking / longer with seconds elapsed)",
      "Calendar (Month / Week / Day) with event CRUD",
      "AI Meeting Room with anti-echo prompt rules",
      "MCP server (port 39001) for external clients",
      "BB-System-Reference.md auto-generation injected into agent prompts",
      "Auto-backup of metadata DB before every schema migration",
      "Device registration with plan-based limit (Free 1 / Starter 2 / Pro+ unlimited)",
      "Mac launch waitlist with 50% off first-year reward (first 200 signups)",
      "Community translations submission flow (English-only at launch)",
    ],
    knownIssues: [
      "macOS native build: in progress, Mac waitlist on /download",
      "Translations: 9 future locales (Korean / Japanese / Chinese / etc.) currently coming-soon",
      "Mobile / web: planned for v3.2",
      "Some features require Pro+ (DM cloud sync, full Meeting Room, smart search)",
      "Paddle billing integration: live mode wired post-beta",
    ],
  },
];

const STATUS_LABEL: Record<Release["status"], string> = {
  released: "Released",
  preview: "Preview",
};

export default function ChangelogPage() {
  return (
    <main className="py-20 px-6">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-3">Changelog</h1>
          <p className="text-muted-foreground">
            What&apos;s new in BossBoard. Public beta is the first release.
          </p>
        </div>

        <div className="space-y-12">
          {RELEASES.map((r) => (
            <article key={r.version} className="rounded-lg border border-border p-6">
              <div className="flex items-baseline gap-3 mb-1">
                <h2 className="text-2xl font-bold">{r.version}</h2>
                <span
                  className={`text-[10px] font-medium uppercase tracking-wide px-2 py-0.5 rounded ${
                    r.status === "released"
                      ? "bg-green-500/15 text-green-700 dark:text-green-400"
                      : "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                  }`}
                >
                  {STATUS_LABEL[r.status]}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mb-6">{r.date}</p>

              {r.added && r.added.length > 0 && (
                <Section title="Added" items={r.added} />
              )}
              {r.changed && r.changed.length > 0 && (
                <Section title="Changed" items={r.changed} />
              )}
              {r.fixed && r.fixed.length > 0 && (
                <Section title="Fixed" items={r.fixed} />
              )}
              {r.knownIssues && r.knownIssues.length > 0 && (
                <Section
                  title="Known Limitations"
                  items={r.knownIssues}
                  color="text-amber-700 dark:text-amber-400"
                />
              )}

              <p className="text-xs text-muted-foreground mt-6 pt-4 border-t border-border">
                Beta pricing: First 100 paying users get 30% off forever.
              </p>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}

function Section({
  title,
  items,
  color,
}: {
  title: string;
  items: string[];
  color?: string;
}) {
  return (
    <div className="mb-4">
      <h3 className={`font-semibold mb-2 ${color ?? ""}`}>{title}</h3>
      <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
