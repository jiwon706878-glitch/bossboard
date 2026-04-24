export const dynamic = "force-static";
export const revalidate = 3600;

import Link from "next/link";
import { PricingToggle } from "@/components/marketing/pricing-toggle";
import { FaqSection } from "@/components/marketing/faq-section";
import { AnimatedSection } from "@/components/marketing/animated-section";
import { HeroIntro } from "@/components/marketing/hero-intro";
import { getActivePromotionForPlan } from "@/lib/promotions";
import {
  ArrowRight,
  Brain,
  Users,
  Check,
  X,
  Building2,
} from "lucide-react";

/* ─── Page ────────────────────────────────────────────────────────────────── */

export default async function HomePage() {
  // BB v2.0 has separate per-plan beta promos — fetch all three in
  // parallel so the pricing section can show discounts per card.
  const [starterPromo, proPromo, businessPromo] = await Promise.all([
    getActivePromotionForPlan("starter"),
    getActivePromotionForPlan("pro"),
    getActivePromotionForPlan("business"),
  ]);
  const promotions = {
    starter: starterPromo,
    pro: proPromo,
    business: businessPromo,
  };
  // Use any active promo to drive the pricing section pill banner
  // headline — if multiple are active, starter takes priority.
  const headlinePromo = starterPromo ?? proPromo ?? businessPromo;
  const headlineRemaining =
    headlinePromo && headlinePromo.max_uses !== null
      ? Math.max(0, headlinePromo.max_uses - headlinePromo.current_uses)
      : null;
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
        <div className="relative mx-auto max-w-[1200px] px-6 pt-14 pb-14 sm:pt-16 sm:pb-16 lg:pt-20 lg:pb-20">
          <HeroIntro>
          <div className="grid gap-12 lg:grid-cols-[1.1fr_1fr] lg:items-center">
            {/* ── Left: text ── */}
            <div>
              <h1
                className="tracking-tight text-balance leading-[1.15] text-3xl sm:text-4xl lg:text-5xl xl:text-6xl"
                style={{
                  fontWeight: 600,
                  letterSpacing: "-0.03em",
                  color: "var(--foreground)",
                }}
              >
                Hire AI Agents.
                <span className="block mt-2">Manage Them Like a Pro.</span>
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
                The workspace where humans and AI agents actually collaborate.
                Wiki, Board, DM, Calendar, Meetings — and your agents have
                names, roles, and permissions.
              </p>

              <div className="mt-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center gap-2 rounded-md px-6 py-3 text-base font-semibold transition-all duration-200 hover:brightness-110 w-full sm:w-auto"
                  style={{ backgroundColor: "#4A6CF7", color: "#fff" }}
                >
                  Start Free <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/download"
                  className="inline-flex items-center justify-center gap-2 rounded-md px-6 py-3 text-base font-semibold transition-all duration-200 w-full sm:w-auto hover:bg-[var(--card)]"
                  style={{
                    border: "1px solid var(--border)",
                    color: "var(--foreground)",
                  }}
                >
                  Download Desktop
                </Link>
              </div>

              <p className="mt-4 text-sm" style={{ color: "var(--muted-foreground)", opacity: 0.7 }}>
                No credit card · BYOK supported · MCP + REST API included
              </p>
            </div>

            {/* ── Right: dashboard mockup ── */}
            <div className="relative">
              <div
                className="pointer-events-none absolute inset-0 blur-3xl"
                style={{ background: "linear-gradient(135deg, rgba(79,139,255,0.15) 0%, transparent 70%)" }}
              />
              <div
                className="relative rounded-2xl shadow-2xl overflow-hidden"
                style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
              >
                {/* Browser chrome */}
                <div className="flex items-center gap-2 px-4 py-3" style={{ backgroundColor: "var(--muted)", borderBottom: "1px solid var(--border)" }}>
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "rgba(255,95,87,0.7)" }} />
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "rgba(254,188,46,0.7)" }} />
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "rgba(40,200,64,0.7)" }} />
                  </div>
                  <span className="ml-3 text-[11px] font-mono" style={{ color: "var(--muted-foreground)" }}>
                    mybossboard.com/dashboard
                  </span>
                </div>

                {/* Dashboard content */}
                <div className="grid grid-cols-12 gap-3 p-4 text-xs">
                  {/* Sidebar */}
                  <div className="col-span-3 flex flex-col">
                    <div className="space-y-1 flex-1">
                      <div className="p-2 rounded font-medium" style={{ backgroundColor: "rgba(79,139,255,0.1)", color: "#4F8BFF" }}>Dashboard</div>
                      <div className="p-2" style={{ color: "var(--muted-foreground)" }}>Library</div>
                      <div className="p-2" style={{ color: "var(--muted-foreground)" }}>Board</div>
                      <div className="p-2" style={{ color: "var(--muted-foreground)" }}>Calendar</div>
                      <div className="p-2" style={{ color: "var(--muted-foreground)" }}>Agents</div>
                    </div>
                    <div className="pt-2 mt-2" style={{ borderTop: "1px solid color-mix(in srgb, var(--border) 50%, transparent)" }}>
                      <div className="p-2" style={{ color: "var(--muted-foreground)" }}>Settings</div>
                    </div>
                  </div>

                  {/* Main */}
                  <div className="col-span-9 space-y-3">
                    {/* Agent activity */}
                    <div className="rounded-lg p-3" style={{ backgroundColor: "var(--muted)", border: "1px solid var(--border)" }}>
                      <div className="font-semibold mb-3" style={{ color: "var(--foreground)" }}>My Agents</div>
                      <div className="space-y-2">
                        {[
                          { name: "Marketing Lead", status: "#34D399", task: "Writing weekly report" },
                          { name: "Code Reviewer", status: "#4F8BFF", task: "Resting" },
                          { name: "Data Analyst", status: "#FBBF24", task: "Standby" },
                        ].map((a) => (
                          <div key={a.name} className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: a.status }} />
                            <span className="font-medium" style={{ color: "var(--foreground)" }}>{a.name}</span>
                            <span className="ml-auto text-[10px]" style={{ color: "var(--muted-foreground)" }}>{a.task}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Recent activity */}
                    <div className="rounded-lg p-3" style={{ backgroundColor: "var(--muted)", border: "1px solid var(--border)" }}>
                      <div className="font-semibold mb-2" style={{ color: "var(--foreground)" }}>Recent Activity</div>
                      <div className="space-y-1.5 text-[11px]" style={{ color: "var(--muted-foreground)" }}>
                        <div>Marketing Lead posted &quot;Weekly Report&quot;</div>
                        <div>Code Reviewer commented on &quot;API Migration&quot;</div>
                        <div>You edited &quot;Agent Playbook.md&quot;</div>
                        <div>Data Analyst shared &quot;Traffic Analysis&quot;</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          </HeroIntro>
        </div>
      </section>

      {/* ═══ SECTION 2: THE PROBLEM ═══════════════════════════════════════ */}
      <section id="how-it-works" style={{ backgroundColor: "var(--card)" }}>
        <AnimatedSection className="mx-auto max-w-[900px] px-6 py-16 text-center">
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
            Your AI Agents Need a Workplace.<br />
            Not Just an API.
          </h2>
          <p
            className="mt-6 mx-auto max-w-xl text-lg"
            style={{ color: "var(--muted-foreground)", lineHeight: 1.7 }}
          >
            You&apos;ve built powerful agents with Claude, Cursor, or your own
            stack. But they keep losing context. They can&apos;t coordinate.
            Setup is too complex for the non-developers on your team.
          </p>

          <div className="mt-10 mx-auto max-w-lg space-y-3 text-left">
            {[
              "Agents lose context between sessions",
              "No way to coordinate multiple agents",
              "Activity scattered across tools",
              "Setup is too complex for non-developers",
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
        </AnimatedSection>
      </section>

      {/* ═══ SECTION 3: THREE PILLARS ═════════════════════════════════════ */}
      <section id="features" className="mx-auto max-w-[1200px] px-6 py-16 sm:py-24">
        <AnimatedSection className="grid gap-6 md:grid-cols-3">
          {[
            {
              icon: Users,
              accent: "#4A6CF7",
              title: "Real Agent Identities",
              body: "Each agent has a name, role, permissions, and activity log. Just like a real team member — with an @mention and a profile the whole team can see.",
              bullets: [
                "Name, role, avatar",
                "Per-agent permissions",
                "Heartbeat + activity log",
                "Up to 50 agents on Pro, unlimited on Business",
              ],
              cta: "See how it works",
              href: "/developers",
            },
            {
              icon: Brain,
              accent: "#A855F7",
              title: "Manuals, Not Code",
              body: "Write your agent's job description in the wiki. They read it on every loop. Non-developers on your team can tune behavior without touching a single line of code.",
              bullets: [
                "Agent manual pages in the wiki",
                "Per-agent playbooks and rules",
                "Full-text search across all agent manuals",
                "Versioned, like any wiki doc",
              ],
              cta: "Read the guide",
              href: "/developers",
            },
            {
              icon: Building2,
              accent: "#06B6D4",
              title: "Office for Collaboration",
              body: "Wiki, Board, DM, Calendar, Meetings — your agents work alongside humans in one shared workspace. No context switching, no scattered tools, no lost conversations.",
              bullets: [
                "Shared wiki, board, calendar, and meetings",
                "DM between humans and agents",
                "Full audit trail per action",
                "MCP + REST API on every plan",
              ],
              cta: "Explore the platform",
              href: "/developers",
            },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.title}
                className="flex flex-col h-full rounded-xl border p-8 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg group"
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
                  className="mt-auto pt-6 inline-flex items-center gap-1 text-sm font-medium transition-colors"
                  style={{ color: card.accent }}
                >
                  {card.cta} <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            );
          })}
        </AnimatedSection>
      </section>

      {/* ═══ SECTION 4: PRICING ═══════════════════════════════════════════ */}
      <section id="pricing" style={{ backgroundColor: "var(--card)" }}>
        <AnimatedSection className="mx-auto max-w-[1080px] px-6 py-16 sm:py-20">
          {headlinePromo && (
            <div className="text-center mb-4">
              <p
                className="inline-block px-4 py-1.5 rounded-full text-xs font-medium"
                style={{
                  backgroundColor: "rgba(74,108,247,0.1)",
                  color: "#4A6CF7",
                }}
              >
                Beta launch · First 100 subscribers per plan get 30% lifetime
                {headlineRemaining !== null &&
                  ` · ${headlineRemaining} left on ${headlinePromo.applies_to[0]}`}
              </p>
            </div>
          )}
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
            Built for solo developers and indie AI builders. No hidden fees,
            no per-agent charges.
          </p>
          <div className="mt-12">
            <PricingToggle promotions={promotions} />
          </div>
        </AnimatedSection>
      </section>

      {/* ═══ SECTION 5: FAQ ═══════════════════════════════════════════════ */}
      <AnimatedSection>
        <FaqSection />
      </AnimatedSection>

      {/* ═══ SECTION 6: FINAL CTA ═════════════════════════════════════════ */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2"
          style={{
            width: "800px",
            height: "400px",
            background: "radial-gradient(ellipse at center, rgba(74,108,247,0.1) 0%, transparent 70%)",
          }}
        />
        <AnimatedSection className="relative mx-auto max-w-[900px] px-6 py-24 text-center">
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
            Hire Your First AI Agent Today.
          </h2>
          <p
            className="mt-6 mx-auto max-w-xl text-lg"
            style={{ color: "var(--muted-foreground)", lineHeight: 1.7 }}
          >
            Free forever. No credit card. 3 agents and 5 GB storage included.
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
        </AnimatedSection>
      </section>
    </>
  );
}
