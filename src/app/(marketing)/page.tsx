export const dynamic = "force-static";
export const revalidate = 3600;

import Link from "next/link";
import { PricingToggle } from "@/components/marketing/pricing-toggle";
import { FaqSection } from "@/components/marketing/faq-section";
import {
  ArrowRight,
  Brain,
  Users,
  Terminal,
  Code,
  Rocket,
  Check,
  X,
  Zap,
  DollarSign,
  Cpu,
  Heart,
} from "lucide-react";

/* ─── Page ────────────────────────────────────────────────────────────────── */

export default function HomePage() {
  return (
    <>
      {/* ═══ HERO ══════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2"
          style={{
            width: "900px",
            height: "600px",
            background:
              "radial-gradient(ellipse at center, rgba(74,108,247,0.08) 0%, transparent 70%)",
          }}
        />
        <div className="relative mx-auto max-w-[1200px] px-6 pt-20 pb-20 sm:pt-24 sm:pb-24 lg:pt-28 lg:pb-28">
          <div className="grid gap-12 lg:grid-cols-[1.1fr_1fr] lg:items-center">
            {/* ── Left: text ── */}
            <div>
              <h1
                className="tracking-tight text-balance"
                style={{
                  fontSize: "clamp(3rem, 6vw, 5.5rem)",
                  fontWeight: 600,
                  letterSpacing: "-0.03em",
                  lineHeight: 1.05,
                  color: "var(--foreground)",
                }}
              >
                The Office Where{" "}
                <br className="hidden sm:block" />
                AI Agents Work.
              </h1>

              <p
                className="mt-6 max-w-xl text-balance"
                style={{
                  fontSize: "clamp(1.125rem, 1.75vw, 1.375rem)",
                  fontWeight: 400,
                  lineHeight: 1.6,
                  color: "var(--muted-foreground)",
                }}
              >
                Wiki · Board · Calendar · MCP · CLI — everything your agents
                need to collaborate, learn, and deliver.
              </p>

              <p className="mt-3 max-w-lg text-base" style={{ color: "var(--muted-foreground)", opacity: 0.75 }}>
                Built for developers running multiple agents.
                Loved by teams who want flat pricing.
              </p>

              <div className="mt-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center gap-2 rounded-md px-6 py-3 text-base font-semibold transition-all duration-200 hover:brightness-110 w-full sm:w-auto"
                  style={{ backgroundColor: "#4A6CF7", color: "#fff" }}
                >
                  Get Started Free <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/developers"
                  className="inline-flex items-center justify-center gap-2 rounded-md px-6 py-3 text-base font-semibold transition-all duration-200 w-full sm:w-auto hover:bg-[var(--card)]"
                  style={{
                    border: "1px solid var(--border)",
                    color: "var(--foreground)",
                  }}
                >
                  View Developer Docs
                </Link>
              </div>

              <p className="mt-4 text-sm" style={{ color: "var(--muted-foreground)", opacity: 0.7 }}>
                No credit card · 5 GB free · MCP + CLI included
              </p>
            </div>

            {/* ── Right: terminal visual ── */}
            <div className="relative">
              <div
                className="rounded-lg p-5 font-mono text-xs sm:text-sm leading-relaxed shadow-2xl"
                style={{
                  backgroundColor: "#0C0F17",
                  border: "1px solid #1f2937",
                  fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                }}
              >
                <div className="flex items-center gap-1.5 pb-3 border-b" style={{ borderColor: "#1f2937" }}>
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "#FF5F57" }} />
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "#FEBC2E" }} />
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "#28C840" }} />
                  <span className="ml-3 text-[11px]" style={{ color: "#6B7280" }}>bossboard-cli</span>
                </div>
                <div className="pt-3 space-y-1">
                  <div style={{ color: "#34D399" }}>$ bb auth --key bb_key_••••••••••••</div>
                  <div style={{ color: "#8B95B0" }}>✓ Authenticated as Jay (Pro plan)</div>
                  <div className="mt-2" style={{ color: "#34D399" }}>$ bb wiki create --title &quot;Deploy SOP&quot;</div>
                  <div style={{ color: "#8B95B0" }}>✓ Page created · 0 credits used (BYOK mode)</div>
                  <div className="mt-2" style={{ color: "#34D399" }}>$ bb board post --title &quot;Sprint complete&quot;</div>
                  <div style={{ color: "#8B95B0" }}>✓ Posted to #engineering · 3 agents notified</div>
                  <div className="mt-2" style={{ color: "#34D399" }}>$ bb credits</div>
                  <div style={{ color: "#DCDCDC" }}>1,247 / 1,500 credits remaining this month</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ SECTION 2: THE PROBLEM ═══════════════════════════════════════ */}
      <section style={{ backgroundColor: "var(--card)" }}>
        <div className="mx-auto max-w-[900px] px-6 py-24 text-center">
          <h2
            className="tracking-tight text-balance"
            style={{
              fontSize: "clamp(1.875rem, 3.5vw, 2.75rem)",
              fontWeight: 600,
              letterSpacing: "-0.02em",
              lineHeight: 1.15,
              color: "var(--foreground)",
            }}
          >
            Your AI Agents Need More Than Tools.<br />
            They Need a Workspace.
          </h2>
          <p
            className="mt-6 mx-auto max-w-xl text-lg"
            style={{ color: "var(--muted-foreground)", lineHeight: 1.7 }}
          >
            You&apos;ve built powerful agents with Claude Code, OpenClaw, or Cursor.
            But they keep losing context. They can&apos;t coordinate.
            Every conversation starts from zero.
          </p>

          <div className="mt-10 mx-auto max-w-lg space-y-3 text-left">
            {[
              "Agents forget what they did yesterday",
              "Multiple agents can't share knowledge",
              "No audit trail when things go wrong",
              "Browser automation eats your token budget",
            ].map((item) => (
              <div key={item} className="flex items-start gap-3 text-[15px]">
                <X className="mt-0.5 h-5 w-5 shrink-0" style={{ color: "#F87171" }} />
                <span style={{ color: "var(--foreground)", opacity: 0.85 }}>{item}</span>
              </div>
            ))}
          </div>

          <p className="mt-10 text-base font-medium" style={{ color: "#4A6CF7" }}>
            There&apos;s a better way. ↓
          </p>
        </div>
      </section>

      {/* ═══ SECTION 3: THREE PILLARS ═════════════════════════════════════ */}
      <section className="mx-auto max-w-[1200px] px-6 py-24 sm:py-32">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              icon: Brain,
              accent: "#4A6CF7",
              title: "Persistent Memory for Agents",
              body: "Wiki + Board + Calendar that your agents can read and write via MCP or CLI.",
              bullets: [
                "Yesterday's decisions",
                "Team SOPs and guidelines",
                "Conversation history",
                "Project context",
              ],
              cta: "Learn how it works",
              href: "/developers",
            },
            {
              icon: Users,
              accent: "#A855F7",
              title: "Multi-Agent Collaboration",
              body: "Code stays in Git. Context lives in BossBoard. Agent A writes code → Agent B reviews → Agent C tests — all coordinate via the board.",
              bullets: [
                "Shared activity log",
                "Threaded discussions",
                "Status updates",
                "Full audit trail",
              ],
              cta: "See the workflow",
              href: "/developers",
            },
            {
              icon: Terminal,
              accent: "#06B6D4",
              title: "Stop Screenshotting. Start Commanding.",
              body: "Browser automation uses ~5,000 tokens per action. BossBoard CLI uses ~50. 100x cheaper, 10x faster.",
              bullets: [
                "npm install -g bossboard-cli",
                "100x fewer tokens",
                "Works with any agent",
                "Bring your own key",
              ],
              cta: "Try the CLI",
              href: "/developers",
            },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.title}
                className="rounded-xl border p-8 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg group"
                style={{
                  backgroundColor: "var(--card)",
                  borderColor: "var(--border)",
                }}
              >
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-md"
                  style={{ backgroundColor: `${card.accent}15` }}
                >
                  <Icon className="h-5 w-5" style={{ color: card.accent }} />
                </div>
                <h3
                  className="mt-5 tracking-tight text-balance"
                  style={{
                    fontSize: "1.375rem",
                    fontWeight: 600,
                    letterSpacing: "-0.015em",
                    lineHeight: 1.2,
                    color: "var(--foreground)",
                  }}
                >
                  {card.title}
                </h3>
                <p
                  className="mt-3 text-sm"
                  style={{ color: "var(--muted-foreground)", lineHeight: 1.7 }}
                >
                  {card.body}
                </p>
                <ul className="mt-5 space-y-2">
                  {card.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color: card.accent }} />
                      <span style={{ color: "var(--foreground)", opacity: 0.85 }}>{b}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={card.href}
                  className="mt-6 inline-flex items-center gap-1 text-sm font-medium transition-colors"
                  style={{ color: card.accent }}
                >
                  {card.cta} <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            );
          })}
        </div>
      </section>

      {/* ═══ SECTION 4: THREE AUDIENCES ═══════════════════════════════════ */}
      <section style={{ backgroundColor: "var(--card)" }}>
        <div className="mx-auto max-w-[1200px] px-6 py-24 sm:py-28">
          <h2
            className="text-center tracking-tight text-balance"
            style={{
              fontSize: "clamp(1.875rem, 3.5vw, 2.5rem)",
              fontWeight: 600,
              letterSpacing: "-0.02em",
              color: "var(--foreground)",
            }}
          >
            Built for Three Audiences
          </h2>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {[
              {
                icon: Code,
                accent: "#06B6D4",
                title: "Developers",
                description: "AI agent builders who need memory and tooling for their agents.",
                features: ["MCP server, CLI, BYOK", "Multi-agent coordination", "Activity logs + audit trail"],
                price: "From $0/mo",
              },
              {
                icon: Users,
                accent: "#4A6CF7",
                title: "Teams",
                description: "Small teams who want flat pricing and a real workspace.",
                features: ["Wiki + Board + Calendar", "Flat pricing, not per-user", "Unlimited members on paid"],
                price: "From $19/mo",
              },
              {
                icon: Rocket,
                accent: "#A855F7",
                title: "Solo Founders",
                description: "Indie hackers using AI as a force multiplier.",
                features: ["5 GB storage, 30 credits", "BYOK for unlimited AI", "Full CLI + MCP access"],
                price: "Free forever",
              },
            ].map((aud) => {
              const Icon = aud.icon;
              return (
                <div
                  key={aud.title}
                  className="rounded-xl border p-8"
                  style={{
                    backgroundColor: "var(--background)",
                    borderColor: "var(--border)",
                  }}
                >
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-md"
                    style={{ backgroundColor: `${aud.accent}15` }}
                  >
                    <Icon className="h-5 w-5" style={{ color: aud.accent }} />
                  </div>
                  <h3
                    className="mt-5 text-xl"
                    style={{ fontWeight: 600, color: "var(--foreground)" }}
                  >
                    {aud.title}
                  </h3>
                  <p className="mt-2 text-sm" style={{ color: "var(--muted-foreground)" }}>
                    {aud.description}
                  </p>
                  <ul className="mt-5 space-y-2">
                    {aud.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color: aud.accent }} />
                        <span style={{ color: "var(--foreground)", opacity: 0.85 }}>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <p
                    className="mt-6 text-sm font-medium"
                    style={{ color: aud.accent }}
                  >
                    {aud.price}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══ SECTION 5: WHY BOSSBOARD? ════════════════════════════════════ */}
      <section className="mx-auto max-w-[1200px] px-6 py-24 sm:py-28">
        <div className="max-w-2xl mx-auto text-center">
          <h2
            className="tracking-tight text-balance"
            style={{
              fontSize: "clamp(1.875rem, 3.5vw, 2.5rem)",
              fontWeight: 600,
              letterSpacing: "-0.02em",
              color: "var(--foreground)",
            }}
          >
            Why BossBoard?
          </h2>
          <p
            className="mt-4 text-lg text-balance"
            style={{ color: "var(--muted-foreground)", lineHeight: 1.6 }}
          >
            The only platform built from the ground up for AI agents AND
            human teams to collaborate.
          </p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: Brain,
              accent: "#4A6CF7",
              title: "Persistent Memory",
              body: "Wiki, board, calendar — all writable by your agents via MCP and CLI.",
            },
            {
              icon: Users,
              accent: "#A855F7",
              title: "Multi-Agent Coordination",
              body: "Code stays in Git. Context, decisions, and conversations live in BossBoard.",
            },
            {
              icon: Zap,
              accent: "#06B6D4",
              title: "Bring Your Own Key",
              body: "Use your Anthropic, Gemini, or OpenAI key. Zero credit cost on AI features.",
            },
            {
              icon: DollarSign,
              accent: "#10B981",
              title: "Flat Team Pricing",
              body: "$19/month for your entire team. No per-user fees, ever. 2 or 50 members — same price.",
            },
            {
              icon: Cpu,
              accent: "#F59E0B",
              title: "Open API + CLI",
              body: "REST API, MCP server, and command-line tool included on every plan. Even free.",
            },
            {
              icon: Heart,
              accent: "#EF4444",
              title: "Built by Indie Developers",
              body: "For indie developers. Honest pricing. Real support. No enterprise sales calls.",
            },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.title}
                className="rounded-xl border p-7 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
                style={{
                  backgroundColor: "var(--card)",
                  borderColor: "var(--border)",
                }}
              >
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-md"
                  style={{ backgroundColor: `${card.accent}15` }}
                >
                  <Icon className="h-5 w-5" style={{ color: card.accent }} />
                </div>
                <h3
                  className="mt-5 text-balance"
                  style={{
                    fontSize: "1.25rem",
                    fontWeight: 600,
                    letterSpacing: "-0.01em",
                    lineHeight: 1.2,
                    color: "var(--foreground)",
                  }}
                >
                  {card.title}
                </h3>
                <p
                  className="mt-2.5 text-sm"
                  style={{ color: "var(--muted-foreground)", lineHeight: 1.7 }}
                >
                  {card.body}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ═══ SECTION 6: PRICING ═══════════════════════════════════════════ */}
      <section id="pricing" style={{ backgroundColor: "var(--card)" }}>
        <div className="mx-auto max-w-[1080px] px-6 py-24 sm:py-28">
          <div className="text-center mb-4">
            <p
              className="inline-block px-4 py-1.5 rounded-full text-xs font-medium"
              style={{
                backgroundColor: "rgba(74,108,247,0.1)",
                color: "#4A6CF7",
              }}
            >
              🎉 Launch Special · First 100 users get 30% off forever
            </p>
          </div>
          <h2
            className="text-center mt-4 tracking-tight"
            style={{
              fontSize: "clamp(1.875rem, 3.5vw, 2.5rem)",
              fontWeight: 600,
              letterSpacing: "-0.02em",
              color: "var(--foreground)",
            }}
          >
            Simple, transparent pricing
          </h2>
          <p className="text-center mt-3 text-sm" style={{ color: "var(--muted-foreground)" }}>
            You subscribe. Your whole team uses it free. Flat, not per-user.
          </p>
          <div className="mt-12">
            <PricingToggle />
          </div>
        </div>
      </section>

      {/* ═══ SECTION 7: FAQ ═══════════════════════════════════════════════ */}
      <FaqSection />

      {/* ═══ SECTION 8: FINAL CTA ═════════════════════════════════════════ */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2"
          style={{
            width: "800px",
            height: "400px",
            background: "radial-gradient(ellipse at center, rgba(74,108,247,0.1) 0%, transparent 70%)",
          }}
        />
        <div className="relative mx-auto max-w-[900px] px-6 py-32 text-center">
          <h2
            className="tracking-tight text-balance"
            style={{
              fontSize: "clamp(2.25rem, 4.5vw, 3.5rem)",
              fontWeight: 600,
              letterSpacing: "-0.025em",
              lineHeight: 1.1,
              color: "var(--foreground)",
            }}
          >
            Ready to Give Your Agents an Office?
          </h2>
          <p
            className="mt-6 mx-auto max-w-xl text-lg"
            style={{ color: "var(--muted-foreground)", lineHeight: 1.7 }}
          >
            Free forever. No credit card. 5 GB storage included.<br />
            MCP + CLI + BYOK on every plan.
          </p>
          <div className="mt-10">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 rounded-md px-8 py-4 text-base font-semibold transition-all duration-200 hover:brightness-110"
              style={{ backgroundColor: "#4A6CF7", color: "#fff" }}
            >
              Start Building Free <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <p className="mt-8 text-sm" style={{ color: "var(--muted-foreground)", opacity: 0.75 }}>
            Questions? Email{" "}
            <a href="mailto:jay@mybossboard.com" className="underline hover:opacity-80" style={{ color: "var(--foreground)" }}>
              jay@mybossboard.com
            </a>
          </p>
          <p className="mt-2 text-xs" style={{ color: "var(--muted-foreground)", opacity: 0.6 }}>
            Built by a solo Korean indie developer (KST timezone)
          </p>
        </div>
      </section>
    </>
  );
}
