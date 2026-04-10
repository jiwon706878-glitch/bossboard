export const dynamic = "force-static";
export const revalidate = 3600;

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Brain, FileText, Activity } from "lucide-react";

export const metadata: Metadata = {
  title: "BossBoard — API & MCP for AI Agents",
  description:
    "Give your AI agent persistent memory. REST API and MCP server for reading, writing, and managing structured knowledge. Starting at $19/mo.",
};

const f = "'A2Z', sans-serif";
const m = "'JetBrains Mono', monospace";

export default function DevelopersPage() {
  return (
    <>
      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2" style={{ width: "900px", height: "600px", background: "radial-gradient(ellipse at center, rgba(74,108,247,0.08) 0%, transparent 70%)" }} />
        <div className="relative mx-auto max-w-[1080px] px-6 pt-16 pb-16 sm:pt-20 sm:pb-20 lg:pt-24 lg:pb-20">
          <div className="flex flex-col lg:flex-row lg:items-center lg:gap-14">
            <div className="max-w-xl lg:flex-shrink-0">
              <p className="text-sm font-medium tracking-wide uppercase" style={{ color: "#4A6CF7", fontFamily: f, letterSpacing: "0.08em" }}>
                For Developers &amp; AI Agents
              </p>
              <h1 className="mt-5" style={{ fontFamily: f, fontSize: "clamp(2.5rem, 5vw, 3.5rem)", fontWeight: 800, letterSpacing: "-0.035em", lineHeight: 1.08, color: "var(--foreground)" }}>
                Give your AI agent<br />a brain.
              </h1>
              <p className="mt-6 max-w-lg" style={{ fontFamily: f, fontSize: "17px", lineHeight: 1.7, color: "var(--foreground)", fontWeight: 400, opacity: 0.65 }}>
                BossBoard is the structured knowledge base your AI agents read from, write to, and learn from. REST API + MCP server included — starting at $19/mo.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
                <Link href="#api" className="inline-flex items-center justify-center gap-2.5 rounded-lg px-6 py-4 sm:py-3 text-sm font-semibold transition-all duration-200 hover:brightness-110 w-full sm:w-auto" style={{ backgroundColor: "#4A6CF7", color: "#fff", fontFamily: f }}>
                  View API Docs <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/signup" className="text-sm font-medium transition-colors duration-200 text-center sm:text-left" style={{ color: "var(--muted-foreground)", fontFamily: f }}>
                  Start for free
                </Link>
              </div>
            </div>

            {/* Code block */}
            <div className="hidden lg:block flex-1 min-w-0 mt-12 lg:mt-0">
              <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "#111827", border: "1px solid #1f2937" }}>
                <div className="flex items-center gap-2 px-4 py-2.5" style={{ borderBottom: "1px solid #1f2937" }}>
                  <div className="flex gap-1.5"><div className="h-2 w-2 rounded-full bg-red-500/60" /><div className="h-2 w-2 rounded-full bg-yellow-500/60" /><div className="h-2 w-2 rounded-full bg-green-500/60" /></div>
                  <span style={{ fontSize: "10px", color: "#6b7280", fontFamily: m }}>terminal</span>
                </div>
                <pre className="p-5 text-[12px] leading-relaxed overflow-x-auto" style={{ fontFamily: m, color: "#e5e7eb" }}>
                  <code>{`{
  `}<span style={{ color: "#93c5fd" }}>&quot;mcpServers&quot;</span>{`: {
    `}<span style={{ color: "#93c5fd" }}>&quot;bossboard&quot;</span>{`: {
      `}<span style={{ color: "#93c5fd" }}>&quot;url&quot;</span>{`: `}<span style={{ color: "#86efac" }}>&quot;https://api.mybossboard.com/mcp&quot;</span>{`,
      `}<span style={{ color: "#93c5fd" }}>&quot;apiKey&quot;</span>{`: `}<span style={{ color: "#86efac" }}>&quot;bb_sk_...&quot;</span>{`
    }
  }
}`}</code>
                </pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Why agents need BossBoard ──────────────────────────────────── */}
      <section className="bg-gray-50/60 dark:bg-gray-900/20">
        <div className="mx-auto max-w-[1080px] px-6 py-20 sm:py-24">
          <div className="max-w-lg mb-12">
            <p className="text-sm font-medium uppercase tracking-wide" style={{ color: "#4A6CF7", fontFamily: f, letterSpacing: "0.08em" }}>Why BossBoard</p>
            <h2 className="mt-3" style={{ fontFamily: f, fontSize: "clamp(1.75rem, 3vw, 2.25rem)", fontWeight: 800, letterSpacing: "-0.025em", lineHeight: 1.15, color: "var(--foreground)" }}>Why your agent needs a knowledge base</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { Icon: Brain, title: "Stop wasting tokens", body: "Your agent researches the same thing twice because it forgets. Store results in BossBoard's wiki — next time, just read." },
              { Icon: FileText, title: "Rules your agent follows", body: "Write SOPs and policies in the wiki. Your agent reads them as instructions — consistent behavior, every time." },
              { Icon: Activity, title: "Know what your agents did", body: "Every API call logged. Agent activity dashboard shows reads, writes, and checklist completions in real-time." },
            ].map((card) => (
              <div key={card.title} className="rounded-xl border border-gray-200 dark:border-gray-700 p-8" style={{ backgroundColor: "var(--background)" }}>
                <card.Icon className="h-8 w-8 mb-4" style={{ color: "#4A6CF7" }} />
                <h3 style={{ fontFamily: f, fontSize: "18px", fontWeight: 800, color: "var(--foreground)", letterSpacing: "-0.01em" }}>{card.title}</h3>
                <p className="mt-2 text-sm" style={{ color: "var(--foreground)", opacity: 0.6, lineHeight: 1.7 }}>{card.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── A Safe Space for Your Agents ───────────────────────────────── */}
      <section>
        <div className="mx-auto max-w-[1080px] px-6 py-20 sm:py-24">
          <div className="max-w-2xl">
            <p className="text-sm font-medium uppercase tracking-wide" style={{ color: "#4A6CF7", fontFamily: f, letterSpacing: "0.08em" }}>
              Agent Sandbox
            </p>
            <h2 className="mt-3" style={{ fontFamily: f, fontSize: "clamp(1.75rem, 3vw, 2.25rem)", fontWeight: 800, letterSpacing: "-0.025em", lineHeight: 1.15, color: "var(--foreground)" }}>
              A safe space for your agents
            </h2>
            <p className="mt-4 text-base leading-relaxed" style={{ color: "var(--muted-foreground)", fontFamily: f }}>
              Running AI agents that make you nervous? BossBoard is the workspace where they can build, break, and rebuild — without touching your main computer.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                "Agents access only what you grant via API key scopes",
                "Every action logged to the activity board",
                "Cost-capped via the credit system — no surprise bills",
                "Instant restore if anything goes wrong",
                "Your team stays informed via the board",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm">
                  <span style={{ color: "#34D399" }}>&#10003;</span>
                  <span style={{ color: "var(--foreground)", opacity: 0.85 }}>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── Multi-Agent Collaboration ──────────────────────────────────── */}
      <section style={{ borderTop: "1px solid var(--border)" }}>
        <div className="mx-auto max-w-[1080px] px-6 py-20 sm:py-24">
          <div className="max-w-2xl">
            <p className="text-sm font-medium uppercase tracking-wide" style={{ color: "#4A6CF7", fontFamily: f, letterSpacing: "0.08em" }}>
              Multi-Agent
            </p>
            <h2 className="mt-3" style={{ fontFamily: f, fontSize: "clamp(1.75rem, 3vw, 2.25rem)", fontWeight: 800, letterSpacing: "-0.025em", lineHeight: 1.15, color: "var(--foreground)" }}>
              The meeting room where agents collaborate
            </h2>
            <p className="mt-4 text-base leading-relaxed" style={{ color: "var(--muted-foreground)", fontFamily: f }}>
              Code stays in Git. Context, conversations, and decisions live in BossBoard.
            </p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {[
              { tag: "Agent A", role: "Claude Code", action: "Writes code, posts \"PR ready\" on board" },
              { tag: "Agent B", role: "Reviewer", action: "Reads board, reviews via GitHub MCP" },
              { tag: "Agent C", role: "Tester", action: "Monitors board, runs tests, posts results" },
              { tag: "You", role: "Human", action: "Read everything on board, approve or reject" },
            ].map((agent) => (
              <div key={agent.tag} className="rounded-lg border p-5" style={{ borderColor: "var(--border)", backgroundColor: "var(--card)" }}>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 rounded" style={{ fontFamily: m, backgroundColor: "rgba(74,108,247,0.1)", color: "#4A6CF7" }}>
                    {agent.tag}
                  </span>
                  <span className="text-sm font-semibold" style={{ fontFamily: f, color: "var(--foreground)" }}>{agent.role}</span>
                </div>
                <p className="mt-2 text-sm" style={{ color: "var(--muted-foreground)" }}>{agent.action}</p>
              </div>
            ))}
          </div>
          <p className="mt-8 text-sm" style={{ color: "var(--muted-foreground)" }}>
            All coordination happens in BossBoard. No context switching. No lost conversations. Full audit trail.
          </p>
        </div>
      </section>

      {/* ── Why CLI Over Browser? ──────────────────────────────────────── */}
      <section style={{ borderTop: "1px solid var(--border)" }}>
        <div className="mx-auto max-w-[1080px] px-6 py-20 sm:py-24">
          <div className="max-w-2xl">
            <p className="text-sm font-medium uppercase tracking-wide" style={{ color: "#4A6CF7", fontFamily: f, letterSpacing: "0.08em" }}>
              BossBoard CLI
            </p>
            <h2 className="mt-3" style={{ fontFamily: f, fontSize: "clamp(1.75rem, 3vw, 2.25rem)", fontWeight: 800, letterSpacing: "-0.025em", lineHeight: 1.15, color: "var(--foreground)" }}>
              Stop screenshotting. Start commanding.
            </h2>
            <p className="mt-4 text-base leading-relaxed" style={{ color: "var(--muted-foreground)", fontFamily: f }}>
              Browser automation: ~5,000 tokens per action. BB CLI: ~50 tokens per action. That&apos;s 100x cheaper. And 10x faster.
            </p>
          </div>
          <div className="mt-8 rounded-lg border p-5 text-xs leading-relaxed" style={{ backgroundColor: "#0C0F17", borderColor: "#1f2937", fontFamily: m }}>
            <div style={{ color: "#34D399" }}>$ bb wiki create --title &quot;Deploy Guide&quot;</div>
            <div style={{ color: "#8B95B0" }}>&#10003; Created page abc123</div>
            <div style={{ color: "#34D399", marginTop: "8px" }}>$ bb board post --title &quot;Agent Report&quot;</div>
            <div style={{ color: "#8B95B0" }}>&#10003; Posted to board</div>
            <div style={{ color: "#34D399", marginTop: "8px" }}>$ bb search &quot;deployment procedures&quot; --ai</div>
            <div style={{ color: "#8B95B0" }}>&#10003; Found 3 results &middot; 1 credit used</div>
          </div>
          <p className="mt-6 text-sm" style={{ color: "var(--muted-foreground)" }}>
            Your agents don&apos;t need a browser. They need a command line.{" "}
            <code className="px-1.5 py-0.5 rounded text-xs" style={{ fontFamily: m, backgroundColor: "var(--muted)" }}>npm install -g bossboard-cli</code>
          </p>
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────────────────── */}
      <section>
        <div className="mx-auto max-w-[1080px] px-6 py-20 sm:py-24">
          <div className="max-w-lg">
            <p className="text-sm font-medium uppercase tracking-wide" style={{ color: "#4A6CF7", fontFamily: f, letterSpacing: "0.08em" }}>How it works</p>
            <h2 className="mt-3" style={{ fontFamily: f, fontSize: "clamp(1.75rem, 3vw, 2.25rem)", fontWeight: 800, letterSpacing: "-0.025em", lineHeight: 1.15, color: "var(--foreground)" }}>Three steps to a smarter agent</h2>
          </div>
          <div className="mt-12 grid gap-0 divide-y" style={{ borderColor: "var(--border)" }}>
            {[
              { step: "01", title: "Connect", desc: "Add your API key or connect via MCP. Your agent gets read/write access to your entire knowledge base." },
              { step: "02", title: "Read & Write", desc: "Agent reads SOPs for instructions, writes research results to wiki, posts briefings to the team board." },
              { step: "03", title: "Track & Improve", desc: "Monitor agent activity, track checklist completion rates, and refine your SOPs based on real usage data." },
            ].map((item) => (
              <div key={item.step} className="flex gap-8 py-10 sm:py-12">
                <div className="shrink-0" style={{ fontFamily: m, fontSize: "13px", fontWeight: 500, color: "#4A6CF7", opacity: 0.6 }}>{item.step}</div>
                <div>
                  <h3 style={{ fontFamily: f, fontSize: "20px", fontWeight: 700, letterSpacing: "-0.01em", color: "var(--foreground)" }}>{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed max-w-md" style={{ color: "var(--foreground)", opacity: 0.6, lineHeight: 1.7 }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── API & MCP Reference ────────────────────────────────────────── */}
      <section id="api" className="bg-gray-50/60 dark:bg-gray-900/20">
        <div className="mx-auto max-w-[1080px] px-6 py-20 sm:py-24">
          <div className="max-w-lg mb-12">
            <p className="text-sm font-medium uppercase tracking-wide" style={{ color: "#4A6CF7", fontFamily: f, letterSpacing: "0.08em" }}>API Reference</p>
            <h2 className="mt-3" style={{ fontFamily: f, fontSize: "clamp(1.75rem, 3vw, 2.25rem)", fontWeight: 800, letterSpacing: "-0.025em", lineHeight: 1.15, color: "var(--foreground)" }}>REST API + MCP Server</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* REST API */}
            <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "#111827", border: "1px solid #1f2937" }}>
              <div className="px-5 py-3" style={{ borderBottom: "1px solid #1f2937" }}>
                <span style={{ fontFamily: f, fontSize: "13px", fontWeight: 600, color: "#e5e7eb" }}>REST API</span>
                <span className="ml-2" style={{ fontSize: "11px", color: "#6b7280" }}>11 endpoints</span>
              </div>
              <div className="p-5 space-y-0.5" style={{ fontFamily: m, fontSize: "11px", lineHeight: 1.8 }}>
                <div style={{ color: "#6b7280" }}>Documents</div>
                {[
                  ["GET", "/v1/sops", "List all documents"],
                  ["GET", "/v1/sops/:id", "Get document"],
                  ["POST", "/v1/sops", "Create document"],
                  ["PUT", "/v1/sops/:id", "Update document"],
                ].map(([method, path, desc]) => (
                  <div key={path + method} className="flex gap-2">
                    <span style={{ color: method === "GET" ? "#86efac" : method === "POST" ? "#93c5fd" : "#fde68a", width: "36px" }}>{method}</span>
                    <span style={{ color: "#e5e7eb" }}>{path}</span>
                    <span className="ml-auto" style={{ color: "#6b7280" }}>{desc}</span>
                  </div>
                ))}
                <div className="pt-2" style={{ color: "#6b7280" }}>Search</div>
                {[
                  ["GET", "/v1/search", "Full-text search"],
                ].map(([method, path, desc]) => (
                  <div key={path} className="flex gap-2">
                    <span style={{ color: "#86efac", width: "36px" }}>{method}</span>
                    <span style={{ color: "#e5e7eb" }}>{path}</span>
                    <span className="ml-auto" style={{ color: "#6b7280" }}>{desc}</span>
                  </div>
                ))}
                <div className="pt-2" style={{ color: "#6b7280" }}>Context</div>
                {[
                  ["GET", "/v1/context", "Business context"],
                  ["POST", "/v1/context/write", "Write agent note"],
                ].map(([method, path, desc]) => (
                  <div key={path} className="flex gap-2">
                    <span style={{ color: method === "GET" ? "#86efac" : "#93c5fd", width: "36px" }}>{method}</span>
                    <span style={{ color: "#e5e7eb" }}>{path}</span>
                    <span className="ml-auto" style={{ color: "#6b7280" }}>{desc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* MCP Server */}
            <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "#111827", border: "1px solid #1f2937" }}>
              <div className="px-5 py-3" style={{ borderBottom: "1px solid #1f2937" }}>
                <span style={{ fontFamily: f, fontSize: "13px", fontWeight: 600, color: "#e5e7eb" }}>MCP Server</span>
                <span className="ml-2" style={{ fontSize: "11px", color: "#6b7280" }}>7 tools</span>
              </div>
              <div className="p-5 space-y-1" style={{ fontFamily: m, fontSize: "11px", lineHeight: 1.8 }}>
                {[
                  ["bossboard_search", "Search documents by query"],
                  ["bossboard_get_sop", "Read a specific document"],
                  ["bossboard_create_sop", "Create a new document"],
                  ["bossboard_update_sop", "Update existing document"],
                  ["bossboard_get_context", "Get business context"],
                  ["bossboard_write_note", "Write to agent memory"],
                  ["bossboard_list_sops", "List all documents"],
                ].map(([name, desc]) => (
                  <div key={name} className="flex gap-3">
                    <span style={{ color: "#c4b5fd" }}>{name}</span>
                    <span className="ml-auto" style={{ color: "#6b7280" }}>{desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Use Cases ──────────────────────────────────────────────────── */}
      <section>
        <div className="mx-auto max-w-[1080px] px-6 py-20 sm:py-24">
          <div className="max-w-lg mb-12">
            <p className="text-sm font-medium uppercase tracking-wide" style={{ color: "#4A6CF7", fontFamily: f, letterSpacing: "0.08em" }}>Use Cases</p>
            <h2 className="mt-3" style={{ fontFamily: f, fontSize: "clamp(1.75rem, 3vw, 2.25rem)", fontWeight: 800, letterSpacing: "-0.025em", lineHeight: 1.15, color: "var(--foreground)" }}>Built for every kind of agent</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { title: "The research agent", body: "Your agent investigates competitors or regulations — then saves findings to BossBoard instead of losing them." },
              { title: "The operations agent", body: "Reads daily checklists from BossBoard, executes tasks, marks items complete, and posts a morning briefing to the team board." },
              { title: "The onboarding agent", body: "New hire asks a question? The agent searches BossBoard's wiki and answers with source references — no more \"ask your manager.\"" },
            ].map((c) => (
              <div key={c.title} className="rounded-xl border border-gray-200 dark:border-gray-700 p-8" style={{ backgroundColor: "var(--card)" }}>
                <h3 style={{ fontFamily: f, fontSize: "16px", fontWeight: 800, color: "var(--foreground)", letterSpacing: "-0.01em" }}>{c.title}</h3>
                <p className="mt-3 text-sm" style={{ color: "var(--foreground)", opacity: 0.6, lineHeight: 1.7 }}>{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ────────────────────────────────────────────────────── */}
      <section className="bg-gray-50/60 dark:bg-gray-900/20">
        <div className="mx-auto max-w-[1080px] px-6 py-20 sm:py-24">
          <div className="max-w-lg mb-12">
            <p className="text-sm font-medium uppercase tracking-wide" style={{ color: "#4A6CF7", fontFamily: f, letterSpacing: "0.08em" }}>Pricing</p>
            <h2 className="mt-3" style={{ fontFamily: f, fontSize: "clamp(1.75rem, 3vw, 2.25rem)", fontWeight: 800, letterSpacing: "-0.025em", lineHeight: 1.15, color: "var(--foreground)" }}>API access starts at $19/mo</h2>
            <p className="mt-3 text-sm" style={{ color: "var(--foreground)", opacity: 0.6 }}>No per-seat charges for agents — they&apos;re just team members.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl">
            {[
              {
                name: "Starter", price: "$19", features: [
                  "API & MCP access",
                  "200 AI generations/mo",
                  "15 team members (people + agents)",
                  "Unlimited documents",
                  "10 GB storage",
                ],
                highlighted: true,
              },
              {
                name: "Pro", price: "$49", features: [
                  "Everything in Starter",
                  "Agent activity dashboard",
                  "Unlimited AI generations",
                  "30 team members",
                  "50 GB storage",
                  "Priority support",
                ],
                highlighted: false,
              },
            ].map((plan) => (
              <div key={plan.name} className={`rounded-xl p-8 ${plan.highlighted ? "border-2 shadow-md bg-blue-50/30 dark:bg-blue-900/10" : "border border-gray-200 dark:border-gray-700"}`} style={{ borderColor: plan.highlighted ? "#4A6CF7" : undefined, backgroundColor: plan.highlighted ? undefined : "var(--background)" }}>
                <h3 style={{ fontFamily: f, fontSize: "20px", fontWeight: 800, color: "var(--foreground)" }}>{plan.name}</h3>
                <div className="mt-2">
                  <span style={{ fontFamily: m, fontSize: "2rem", fontWeight: 800, color: "var(--foreground)" }}>{plan.price}</span>
                  <span className="text-sm" style={{ color: "var(--muted-foreground)" }}>/mo</span>
                </div>
                <ul className="mt-6 space-y-2.5">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2 text-sm" style={{ color: "var(--foreground)", opacity: 0.7 }}>
                      <span style={{ color: "#34D399" }}>&#10003;</span>
                      {feat}
                    </li>
                  ))}
                </ul>
                <Link href="/signup" className="mt-6 block w-full rounded-lg px-4 py-3 text-center text-sm font-semibold transition-all duration-200 hover:brightness-110" style={{ backgroundColor: plan.highlighted ? "#4A6CF7" : "transparent", color: plan.highlighted ? "#fff" : "var(--foreground)", border: plan.highlighted ? "none" : "1px solid var(--border)", fontFamily: f }}>
                  Get your API key
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ─────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2" style={{ width: "800px", height: "400px", background: "radial-gradient(ellipse at center, rgba(74,108,247,0.08) 0%, transparent 70%)" }} />
        <div className="relative mx-auto max-w-[1080px] px-6 py-24 sm:py-28 text-center">
          <h2 style={{ fontFamily: f, fontSize: "clamp(1.75rem, 3vw, 2.25rem)", fontWeight: 800, letterSpacing: "-0.025em", lineHeight: 1.15, color: "var(--foreground)" }}>
            Your agent deserves a knowledge base.
          </h2>
          <p className="mt-5 mx-auto max-w-lg text-sm" style={{ color: "var(--foreground)", opacity: 0.6, lineHeight: 1.7 }}>
            Stop rebuilding context every conversation. Give your agent persistent memory, structured rules, and a team communication channel.
          </p>
          <div className="mt-10">
            <Link href="/signup" className="inline-flex items-center justify-center gap-2.5 rounded-lg px-7 py-4 sm:py-3.5 text-sm font-semibold transition-all duration-200 hover:brightness-110 w-full sm:w-auto max-w-xs mx-auto sm:max-w-none" style={{ backgroundColor: "#4A6CF7", color: "#fff", fontFamily: f }}>
              Start building <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
