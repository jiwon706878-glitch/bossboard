import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "FAQ — BossBoard",
  description:
    "Common questions about BossBoard: BYOK, local-first storage, ChatGPT comparison, Mac launch, refunds.",
};

const FAQS: Array<{ q: string; a: React.ReactNode }> = [
  {
    q: "What is BYOK?",
    a: (
      <>
        BYOK means <strong>Bring Your Own Key</strong>. You use your own API
        keys for AI providers (Anthropic, Google, OpenAI, xAI, or local Ollama).
        BossBoard charges only for the workspace; you pay providers directly for
        AI usage. This means you control costs, you choose the model, and we
        never see your prompts.
      </>
    ),
  },
  {
    q: "How is BossBoard different from ChatGPT Workspace?",
    a: (
      <>
        ChatGPT stores everything on OpenAI servers and only uses OpenAI models.
        BossBoard runs as a desktop app: your files stay on your machine, you
        choose any AI provider, and you can use offline-capable local models
        like Ollama. BossBoard is a workspace; ChatGPT is a single chat with a
        fixed model.
      </>
    ),
  },
  {
    q: "Where is my data stored?",
    a: (
      <>
        All workspace files (Library markdown, agent manuals, agent memory,
        DM transcripts) live locally in <code>~/Documents/BossBoard/</code>.
        Some metadata syncs to our cloud (Supabase) for cross-device account
        and billing — never your file content. DM transcripts are local-only
        on the Free plan.
      </>
    ),
  },
  {
    q: "Can my AI provider see my data?",
    a: (
      <>
        Only the prompt + system instructions you send through them, just like
        any other tool that uses their API. We don&apos;t proxy AI calls — your
        BossBoard agent talks directly to Anthropic / Google / OpenAI from your
        machine using your key.
      </>
    ),
  },
  {
    q: "Is my data used for AI training?",
    a: (
      <>
        Never by BossBoard. Whether your AI provider trains on your data
        depends on the provider — Anthropic, Google, and OpenAI all offer
        opt-out or do-not-train modes for paid API tiers. Use Ollama locally
        for full privacy.
      </>
    ),
  },
  {
    q: "Can I use BossBoard offline?",
    a: (
      <>
        Yes — Library, file editing, and local LLM agents (Ollama, LM Studio)
        all work offline. The cloud features (board posts, DM cloud sync,
        cross-device sign-in) need a network connection.
      </>
    ),
  },
  {
    q: "When will Mac be available?",
    a: (
      <>
        Mac is in progress. Join the{" "}
        <Link href="/download#mac" className="underline hover:text-primary">
          Mac waitlist
        </Link>{" "}
        and the first 200 signups get 50% off their first year when the Mac app
        ships.
      </>
    ),
  },
  {
    q: "When will mobile / web be available?",
    a: (
      <>
        Mobile and web read-only access is planned for v3.2. The full editing
        experience stays on desktop because BossBoard is local-first by design.
      </>
    ),
  },
  {
    q: "Can multiple people use one account?",
    a: (
      <>
        No — each plan limits the number of devices that can sign in (Free 1,
        Starter 2, Pro and Business unlimited). Team workspaces with role-based
        sharing land on the Business plan in v3.2.
      </>
    ),
  },
  {
    q: "How do I get the 30% beta discount?",
    a: (
      <>
        The first 100 paying users get a <strong>30% lifetime discount</strong>{" "}
        applied automatically at checkout. The counter is visible in the
        pricing page. Cancel anytime, full refund within 14 days, the discount
        sticks for life on the same email.
      </>
    ),
  },
  {
    q: "What happens if I cancel?",
    a: (
      <>
        Your local workspace stays on your PC — markdown files in any text
        editor or Obsidian. The cloud account (auth, plan, board posts) is
        retained for 30 days then deleted unless you reactivate.
      </>
    ),
  },
];

export default function FaqPage() {
  return (
    <main className="py-20 px-6">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-3">Frequently asked</h1>
          <p className="text-muted-foreground">
            More questions? Email{" "}
            <a
              href="mailto:jay@mybossboard.com"
              className="text-primary hover:underline"
            >
              jay@mybossboard.com
            </a>{" "}
            — I respond within 24 hours.
          </p>
        </div>

        <div className="space-y-3">
          {FAQS.map((item, i) => (
            <details
              key={i}
              className="rounded-lg border border-border p-4 group"
            >
              <summary className="cursor-pointer font-medium list-none flex items-start gap-3">
                <span className="text-primary group-open:rotate-90 transition-transform">
                  ›
                </span>
                <span>{item.q}</span>
              </summary>
              <div className="text-sm text-muted-foreground mt-3 pl-6 leading-relaxed">
                {item.a}
              </div>
            </details>
          ))}
        </div>
      </div>
    </main>
  );
}
