import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Bring your own AI key — BossBoard Docs",
};

const PROVIDERS = [
  {
    name: "Google Gemini",
    badge: "Cheapest, big free tier",
    where: "https://aistudio.google.com/app/apikey",
    notes: [
      "Sign in with a Google account, click Create API key.",
      "Free tier covers casual use comfortably (250 RPM Flash).",
      "Default model in BB: gemini-2.5-flash.",
    ],
  },
  {
    name: "Anthropic Claude",
    badge: "Best for long manuals",
    where: "https://console.anthropic.com/account/keys",
    notes: [
      "Add a card on console.anthropic.com (no charge until you call).",
      "Tier 1 is rate-limited — bumping spend raises the limit.",
      "Default model in BB: claude-haiku-4-5.",
    ],
  },
  {
    name: "OpenAI",
    badge: "Familiar default",
    where: "https://platform.openai.com/api-keys",
    notes: [
      "Add a payment method then create a new secret key.",
      "Tier 1 = ~3 RPM on GPT-4o until you spend.",
      "Default model in BB: gpt-4o.",
    ],
  },
  {
    name: "xAI Grok",
    badge: "Fast, opinionated",
    where: "https://x.ai/api",
    notes: [
      "Sign in with an X account, generate an API key.",
      "Default model in BB: grok-4-fast (128k context).",
    ],
  },
  {
    name: "Local Ollama (experimental)",
    badge: "Offline, no key",
    where: "https://ollama.ai",
    notes: [
      "Install Ollama on the same machine as BossBoard.",
      "Pick a model: ollama run llama3.2.",
      "Slower than cloud but fully offline + private.",
      "Marked experimental — performance varies by hardware.",
    ],
  },
];

export default function ByokPage() {
  return (
    <main className="py-16 px-6">
      <div className="max-w-3xl mx-auto prose prose-invert dark:prose-invert">
        <Link
          href="/docs"
          className="text-sm text-primary hover:underline no-underline"
        >
          ← Docs
        </Link>
        <h1>Bring your own AI key</h1>
        <p>
          BossBoard charges <strong>$0 for AI</strong>. Your provider bills you
          directly. You can add multiple keys per provider (e.g. Production +
          Personal) and pin a specific key per agent via the{" "}
          <code>ai_key_id</code> frontmatter field.
        </p>

        <p>
          All keys are stored in your <strong>OS keychain</strong> (Windows
          Credential Manager / macOS Keychain). They never sit in plain files
          on disk and they never travel through BossBoard servers.
        </p>

        <h2>Where to add keys in BossBoard</h2>
        <p>
          <strong>Settings → AI Providers → Add API key</strong>. Pick the
          provider, give the key a label (e.g. &ldquo;Personal&rdquo;), paste
          the key, optional notes.
        </p>

        <h2>Per-provider sign-up</h2>
        <div className="not-prose space-y-4 mt-4">
          {PROVIDERS.map((p) => (
            <div key={p.name} className="rounded-lg border border-border p-4">
              <div className="flex items-baseline justify-between mb-1">
                <h3 className="font-semibold text-lg">{p.name}</h3>
                <span className="text-xs px-2 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-400">
                  {p.badge}
                </span>
              </div>
              <a
                href={p.where}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-primary hover:underline break-all"
              >
                {p.where}
              </a>
              <ul className="text-sm text-muted-foreground mt-2 list-disc list-inside space-y-1">
                {p.notes.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <h2>Rate limits</h2>
        <p>
          New API accounts on every cloud provider get low rate limits (Tier
          1: 3–10 requests per minute on most models). When BB hits a 429,
          it surfaces an inline banner with a direct link to the provider&apos;s
          tier page so you can bump it.
        </p>
      </div>
    </main>
  );
}
