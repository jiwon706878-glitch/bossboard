import Link from "next/link";
import { PricingToggle } from "@/components/marketing/pricing-toggle";
import { FaqSection } from "@/components/marketing/faq-section";
import { ArrowRight, FileUp, Sparkles, UsersRound } from "lucide-react";
import {
  HeroMockup,
  FeatureMockAi,
  FeatureMockCalendar,
  FeatureMockBoard,
  FeatureMockApi,
} from "@/components/marketing/hero-mockups";

/* ─── Page ────────────────────────────────────────────────────────────────── */

export default function HomePage() {
  const featureMockups = [<FeatureMockAi key="ai" />, <FeatureMockCalendar key="cal" />, <FeatureMockBoard key="board" />, <FeatureMockApi key="api" />];

  return (
    <>
      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <style>{`
        @keyframes hero-float {
          0%, 100% { transform: perspective(1200px) rotateY(-8deg) rotateX(2deg) translateY(0); }
          50% { transform: perspective(1200px) rotateY(-8deg) rotateX(2deg) translateY(-4px); }
        }
      `}</style>
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2" style={{ width: "900px", height: "600px", background: "radial-gradient(ellipse at center, rgba(74,108,247,0.08) 0%, transparent 70%)" }} />
        <div className="relative mx-auto max-w-[1080px] px-6 pt-16 pb-16 sm:pt-20 sm:pb-20 lg:pt-24 lg:pb-20">
          <div className="flex flex-col lg:flex-row lg:items-center lg:gap-12 overflow-hidden lg:overflow-visible">
            {/* Left — text */}
            <div className="max-w-2xl lg:max-w-[480px] lg:flex-shrink-0">
              <p className="text-sm font-medium tracking-wide uppercase" style={{ color: "#4A6CF7", fontFamily: "'A2Z', sans-serif", letterSpacing: "0.08em" }}>The Operations Wiki for Small Business</p>
              <h1 className="mt-5" style={{ fontFamily: "'A2Z', sans-serif", fontSize: "clamp(2.75rem, 5.5vw, 4rem)", fontWeight: 800, letterSpacing: "-0.035em", lineHeight: 1.08, color: "var(--foreground)" }}>
                Build structure.<br />Drive growth.
              </h1>
              <p className="mt-6 max-w-lg" style={{ fontFamily: "'A2Z', sans-serif", fontSize: "18px", lineHeight: 1.7, color: "var(--foreground)", fontWeight: 400, opacity: 0.65 }}>
                Stop explaining the same thing twice. BossBoard generates manuals with AI, syncs your calendar, runs a team board, and turns SOPs into daily checklists your team actually follows. Developers: connect via REST API or MCP.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
                <Link href="/signup" className="inline-flex items-center justify-center gap-2.5 rounded-lg px-6 py-4 sm:py-3 text-sm font-semibold transition-all duration-200 hover:brightness-110 w-full sm:w-auto" style={{ backgroundColor: "#4A6CF7", color: "#fff", fontFamily: "'A2Z', sans-serif" }}>
                  Start for free <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/#how-it-works" className="text-sm font-medium transition-colors duration-200 text-center sm:text-left" style={{ color: "var(--muted-foreground)", fontFamily: "'A2Z', sans-serif" }}>See how it works</Link>
              </div>
              <p className="mt-5 text-xs text-center sm:text-left" style={{ color: "var(--muted-foreground)", fontFamily: "'A2Z', sans-serif", opacity: 0.7 }}>No credit card required. Free for up to 3 team members.</p>
            </div>

            {/* Right — 3D perspective mockup (desktop only) */}
            <div className="hidden lg:block flex-1 min-w-0 max-w-[90%] ml-auto overflow-hidden py-2">
              <div className="lg:scale-[0.85] origin-right" style={{ animation: "hero-float 4s ease-in-out infinite", transformStyle: "preserve-3d", willChange: "transform", transformOrigin: "right center" }}>
                <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 ring-1 ring-gray-100 dark:ring-gray-800" style={{ backgroundColor: "#ffffff" }}>
                  {/* Browser chrome */}
                  <div className="flex items-center gap-2 px-3.5 py-2.5" style={{ backgroundColor: "#f4f4f5", borderBottom: "1px solid #e4e4e7" }}>
                    <div className="flex gap-1.5">
                      <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "#FF5F57" }} />
                      <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "#FEBC2E" }} />
                      <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "#28C840" }} />
                    </div>
                    <div className="flex-1 flex justify-center">
                      <div className="rounded-md px-3 py-0.5 text-center" style={{ backgroundColor: "#ffffff", border: "1px solid #e4e4e7", fontSize: "10px", color: "#71717a", fontFamily: "'A2Z', sans-serif" }}>mybossboard.com</div>
                    </div>
                    <div className="w-12" />
                  </div>

                  {/* App content */}
                  <div style={{ display: "flex", minHeight: "340px" }}>
                    {/* Sidebar */}
                    <div style={{ width: "140px", borderRight: "1px solid #e4e4e7", backgroundColor: "#fafafa", padding: "12px 8px", flexShrink: 0 }}>
                      {[
                        { n: "Dashboard", a: false },
                        { n: "Wiki", a: true },
                        { n: "Calendar", a: false },
                        { n: "Board", a: false },
                        { n: "Checklists", a: false },
                      ].map((item) => (
                        <div key={item.n} className="flex items-center gap-2 rounded-md px-2 py-1.5 mb-0.5" style={{ backgroundColor: item.a ? "rgba(74,108,247,0.1)" : "transparent" }}>
                          <div className="h-3 w-3 rounded" style={{ backgroundColor: item.a ? "#4A6CF7" : "#d4d4d8" }} />
                          <span style={{ fontSize: "10px", fontFamily: "'A2Z', sans-serif", fontWeight: item.a ? 600 : 400, color: item.a ? "#4A6CF7" : "#71717a" }}>{item.n}</span>
                        </div>
                      ))}
                    </div>

                    {/* Main */}
                    <div style={{ flex: 1, padding: "14px 16px", backgroundColor: "#ffffff" }}>
                      {/* Breadcrumb */}
                      <div className="flex items-center gap-1 mb-3" style={{ fontSize: "10px", color: "#a1a1aa", fontFamily: "'A2Z', sans-serif" }}>
                        <span>Wiki</span>
                        <span style={{ color: "#d4d4d8" }}>&gt;</span>
                        <span style={{ color: "#18181b", fontWeight: 500 }}>Kitchen Operations</span>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 mb-4">
                        <div className="rounded-md px-2.5 py-1" style={{ backgroundColor: "#4A6CF7", fontSize: "9px", color: "#fff", fontFamily: "'A2Z', sans-serif", fontWeight: 600 }}>+ New SOP</div>
                        <div className="rounded-md px-2.5 py-1" style={{ border: "1px solid #e4e4e7", fontSize: "9px", color: "#71717a", fontFamily: "'A2Z', sans-serif" }}>New Folder</div>
                      </div>

                      {/* File list */}
                      <div className="space-y-0" style={{ borderTop: "1px solid #e4e4e7" }}>
                        {/* Folders */}
                        {["Opening Procedures", "Food Safety"].map((f) => (
                          <div key={f} className="flex items-center gap-2 py-2" style={{ borderBottom: "1px solid #f4f4f5" }}>
                            <span style={{ fontSize: "11px" }}>&#128193;</span>
                            <span style={{ fontSize: "10px", fontFamily: "'A2Z', sans-serif", fontWeight: 500, color: "#18181b" }}>{f}</span>
                          </div>
                        ))}
                        {/* Files */}
                        {[
                          { n: "CIP Cleaning Guide", s: "Updated", c: "#22c55e" },
                          { n: "Equipment Maintenance", s: "Review", c: "#f59e0b" },
                          { n: "Staff Onboarding", s: "Updated", c: "#22c55e" },
                        ].map((f) => (
                          <div key={f.n} className="flex items-center gap-2 py-2" style={{ borderBottom: "1px solid #f4f4f5" }}>
                            <span style={{ fontSize: "11px" }}>&#128196;</span>
                            <span style={{ fontSize: "10px", fontFamily: "'A2Z', sans-serif", color: "#18181b", flex: 1 }}>{f.n}</span>
                            <span style={{ fontSize: "8px", fontFamily: "'A2Z', sans-serif", color: f.c, backgroundColor: `${f.c}15`, padding: "1px 6px", borderRadius: "4px", fontWeight: 500 }}>
                              {f.s === "Updated" ? "\u2705" : "\u26a0\ufe0f"} {f.s}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Full-width mockup for mobile/tablet (below hero text) */}
        <div className="lg:hidden mx-auto max-w-[900px] px-6 pb-16 sm:pb-24">
          <HeroMockup />
        </div>
      </section>

      {/* ── Trust Bar ──────────────────────────────────────────────────── */}
      <section className="py-8 overflow-hidden">
        <style>{`
          @keyframes marquee { 0% { transform: translateX(0) } 100% { transform: translateX(-50%) } }
          .trust-marquee { animation: marquee 30s linear infinite; }
          .trust-marquee:hover { animation-play-state: paused; }
          @media (prefers-reduced-motion: reduce) { .trust-marquee { animation: none; } }
        `}</style>
        <div className="mx-auto max-w-[1080px] px-6">
          <p className="text-center text-xs font-medium uppercase tracking-wide mb-5" style={{ color: "var(--muted-foreground)", fontFamily: "'A2Z', sans-serif", letterSpacing: "0.08em", opacity: 0.7 }}>
            Trusted by small businesses everywhere
          </p>
        </div>
        <div className="relative">
          <div className="trust-marquee flex gap-4 w-max">
            {[...Array(2)].map((_, setIdx) =>
              ["Caf\u00e9", "Brewery", "Restaurant", "Office", "Agency", "Salon", "Clinic", "Dev Studio"].map((name) => (
                <div key={`${setIdx}-${name}`} className="flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 px-6 py-2.5 shrink-0">
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap" style={{ fontFamily: "'A2Z', sans-serif" }}>{name}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* ── Problem → Solution ─────────────────────────────────────────── */}
      <section style={{ backgroundColor: "var(--card)" }}>
        <div className="mx-auto max-w-[1080px] px-6 py-12 sm:py-14">
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-20">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--muted-foreground)", fontFamily: "'A2Z', sans-serif", letterSpacing: "0.08em" }}>Sound familiar?</p>
              <div className="mt-6 space-y-5">
                {["New hire? Spend a week explaining everything. Again.", "Procedures buried in group chats and sticky notes.", "Nobody follows the process because nobody can find it."].map((p) => (
                  <div key={p} className="flex gap-3">
                    <span style={{ color: "#F87171", fontSize: "16px", lineHeight: "1.5", flexShrink: 0 }}>&times;</span>
                    <p style={{ fontSize: "15px", color: "var(--foreground)", fontFamily: "'A2Z', sans-serif", lineHeight: 1.6 }}>{p}</p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "#4A6CF7", fontFamily: "'A2Z', sans-serif", letterSpacing: "0.08em" }}>With BossBoard</p>
              <div className="mt-6 space-y-5">
                {["AI writes your manual in 30 seconds.", "Wiki, calendar, and board \u2014 all in one place.", "SOPs become daily checklists. Agents connect via API."].map((s) => (
                  <div key={s} className="flex gap-3">
                    <span style={{ color: "#34D399", fontSize: "14px", lineHeight: "1.6", flexShrink: 0 }}>&#10003;</span>
                    <p style={{ fontSize: "15px", color: "var(--foreground)", fontFamily: "'A2Z', sans-serif", lineHeight: 1.6 }}>{s}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ──────────────────────────────────────────────────────── */}
      <section>
        <div className="mx-auto max-w-[1080px] px-6 py-16 sm:py-20">
          <div className="grid gap-8 md:grid-cols-3">
            {[{ value: "30s", desc: "To generate a full SOP" }, { value: "90%", desc: "Faster than manual writing" }, { value: "0", desc: "Knowledge lost to turnover" }].map((s) => (
              <div key={s.value} className="text-center">
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "2.5rem", fontWeight: 800, color: "var(--foreground)", letterSpacing: "-0.02em", lineHeight: 1 }}>{s.value}</div>
                <p className="mt-2 text-xs mx-auto" style={{ color: "var(--foreground)", opacity: 0.55, maxWidth: "220px" }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────────────── */}
      <section id="features" className="mx-auto max-w-[1080px] px-6 py-24 sm:py-32 lg:py-40">
        <div className="max-w-lg">
          <p className="text-sm font-medium uppercase tracking-wide" style={{ color: "#4A6CF7", fontFamily: "'A2Z', sans-serif", letterSpacing: "0.08em" }}>Features</p>
          <h2 className="mt-3" style={{ fontFamily: "'A2Z', sans-serif", fontSize: "clamp(1.75rem, 3vw, 2.5rem)", fontWeight: 800, letterSpacing: "-0.025em", lineHeight: 1.15, color: "var(--foreground)" }}>Built for how small teams actually work</h2>
        </div>
        <div className="mt-24 space-y-24 lg:space-y-32">
          {[
            { label: "AI Manual Generator", headline: "Describe any task.\nAI writes the manual.", body: "Type a topic or paste existing notes \u2014 BossBoard generates a structured procedure in 30 seconds. Upload PDFs, Word docs, or photos and AI converts them into clean, searchable documents. Every edit is tracked with full version history.", accent: "#4A6CF7" },
            { label: "Calendar + Google Sync", headline: "One calendar.\nEvery deadline.", body: "See todos, checklists, and Google Calendar events in a single view. Drag to reschedule, right-click to add. Connect Google Calendar in one click \u2014 changes sync both ways.", accent: "#34D399" },
            { label: "Team Board", headline: "Discuss, vote,\nstay aligned.", body: "Post notices, start discussions, or run polls \u2014 all with threaded comments and anonymous replies. Pin important updates so nothing gets buried in chat.", accent: "#FBBF24" },
            { label: "REST API + MCP", headline: "Agent-friendly\nfrom day one.", body: "Full REST API for reading and writing SOPs, logging agent activity, and managing context. MCP support included from the $19 Starter plan \u2014 connect Claude, Cursor, or any MCP-compatible tool directly to your wiki.", accent: "#4A6CF7" },
          ].map((feature, i) => (
            <div key={feature.label} className={`flex flex-col gap-8 lg:flex-row lg:gap-16 lg:items-stretch rounded-2xl ${i % 2 === 1 ? "lg:flex-row-reverse" : ""} ${i % 2 === 0 ? "bg-gray-50/60 dark:bg-gray-900/20 p-6 lg:p-10 -mx-6 lg:-mx-10" : ""}`}>
              <div className="flex-1 lg:max-w-md flex flex-col justify-center">
                <p className="text-xs font-medium uppercase tracking-wide" style={{ color: feature.accent, fontFamily: "'A2Z', sans-serif", letterSpacing: "0.08em" }}>{feature.label}</p>
                <h3 className="mt-3 whitespace-pre-line" style={{ fontFamily: "'A2Z', sans-serif", fontSize: "clamp(1.5rem, 2.5vw, 2rem)", fontWeight: 800, letterSpacing: "-0.025em", lineHeight: 1.15, color: "var(--foreground)" }}>{feature.headline}</h3>
                <p className="mt-4 text-sm leading-relaxed" style={{ color: "var(--foreground)", opacity: 0.6, lineHeight: 1.8 }}>{feature.body}</p>
              </div>
              <div className="flex-1 rounded-lg min-h-[280px]" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", overflow: "hidden" }}>
                {featureMockups[i]}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Testimonials ──────────────────────────────────────────────── */}
      <section style={{ backgroundColor: "var(--card)" }}>
        <div className="mx-auto max-w-[1080px] px-6 py-24 sm:py-32">
          <div className="max-w-lg mb-14">
            <p className="text-sm font-medium uppercase tracking-wide" style={{ color: "#4A6CF7", fontFamily: "'A2Z', sans-serif", letterSpacing: "0.08em" }}>Testimonials</p>
            <h2 className="mt-3" style={{ fontFamily: "'A2Z', sans-serif", fontSize: "clamp(1.75rem, 3vw, 2.5rem)", fontWeight: 800, letterSpacing: "-0.025em", lineHeight: 1.15, color: "var(--foreground)" }}>What our users are saying</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                quote: "BossBoard replaced our entire training process. The calendar sync means everyone sees deadlines, and the board keeps the team aligned without a separate chat tool.",
                name: "Operations Manager",
                title: "Food & Beverage",
              },
              {
                quote: "We used to lose a full week training each new barista. Now they open BossBoard and follow the guide. Version history saved us when someone accidentally overwrote a recipe.",
                name: "Caf\u00e9 Owner",
                title: "12 employees",
              },
              {
                quote: "I connected my AI agent to BossBoard via MCP and it writes SOPs for me automatically. The REST API is clean and well-documented.",
                name: "Solo Developer",
                title: "Agency, vibe coder",
              },
            ].map((t) => (
              <div
                key={t.name}
                className="rounded-xl p-8 bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700"
              >
                <div className="flex gap-0.5 mb-4">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <span key={s} className="text-yellow-400" style={{ fontSize: "14px" }}>{"\u2605"}</span>
                  ))}
                </div>
                <p style={{ fontFamily: "'A2Z', sans-serif", fontSize: "14px", fontStyle: "italic", lineHeight: 1.6, color: "var(--foreground)" }}>
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="mt-4">
                  <p className="text-sm font-medium" style={{ color: "var(--foreground)", fontFamily: "'A2Z', sans-serif" }}>{t.name}</p>
                  <p className="text-sm" style={{ color: "var(--muted-foreground)", fontFamily: "'A2Z', sans-serif" }}>{t.title}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs italic text-center mt-6" style={{ color: "var(--muted-foreground)", opacity: 0.6 }}>Early feedback from beta users</p>
        </div>
      </section>

      {/* ── How It Works ───────────────────────────────────────────────── */}
      <section id="how-it-works">
        <div className="mx-auto max-w-[1080px] px-6 py-24 sm:py-32 lg:py-40">
          <div className="max-w-lg">
            <p className="text-sm font-medium uppercase tracking-wide" style={{ color: "#4A6CF7", fontFamily: "'A2Z', sans-serif", letterSpacing: "0.08em" }}>How it works</p>
            <h2 className="mt-3" style={{ fontFamily: "'A2Z', sans-serif", fontSize: "clamp(1.75rem, 3vw, 2.5rem)", fontWeight: 800, letterSpacing: "-0.025em", lineHeight: 1.15, color: "var(--foreground)" }}>From idea to deployed manual in under a minute</h2>
          </div>
          <div className="mt-16 grid gap-0 divide-y" style={{ borderColor: "var(--border)" }}>
            {[
              { step: "01", title: "Describe or upload", desc: "Type a task, paste notes, or upload a PDF. AI handles any format and creates a versioned wiki page.", Icon: FileUp },
              { step: "02", title: "AI creates your manual", desc: "Get a structured SOP in 30 seconds \u2014 numbered steps, safety notes, and checklists. Connect your calendar and board.", Icon: Sparkles },
              { step: "03", title: "Team follows, agents connect", desc: "Share with your team, convert to daily checklists, and track completion. Developers connect via REST API or MCP.", Icon: UsersRound },
            ].map((item) => (
              <div key={item.step} className="flex items-center gap-8 py-10 sm:py-12">
                <div className="shrink-0" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "13px", fontWeight: 500, color: "#4A6CF7", opacity: 0.6 }}>{item.step}</div>
                <div className="flex-1">
                  <h3 style={{ fontFamily: "'A2Z', sans-serif", fontSize: "20px", fontWeight: 700, letterSpacing: "-0.01em", color: "var(--foreground)" }}>{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed max-w-md" style={{ color: "var(--foreground)", opacity: 0.6, lineHeight: 1.7 }}>{item.desc}</p>
                </div>
                <div className="hidden sm:flex shrink-0 items-center justify-center" style={{ width: "100px", height: "100px" }}>
                  <item.Icon className="h-16 w-16" style={{ color: "#4A6CF7", opacity: 0.15 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ────────────────────────────────────────────────────── */}
      <section id="pricing" style={{ backgroundColor: "var(--card)" }}>
        <div className="mx-auto max-w-[1080px] px-6 py-24 sm:py-32 lg:py-40">
          <div className="max-w-lg">
            <p className="text-sm font-medium uppercase tracking-wide" style={{ color: "#4A6CF7", fontFamily: "'A2Z', sans-serif", letterSpacing: "0.08em" }}>Pricing</p>
            <h2 className="mt-3" style={{ fontFamily: "'A2Z', sans-serif", fontSize: "clamp(1.75rem, 3vw, 2.5rem)", fontWeight: 800, letterSpacing: "-0.025em", lineHeight: 1.15, color: "var(--foreground)" }}>Simple, transparent pricing</h2>
            <p className="mt-3 text-sm" style={{ color: "var(--muted-foreground)" }}>You subscribe. Your whole team uses it free.</p>
          </div>
          <div className="mt-14"><PricingToggle /></div>
        </div>
      </section>

      <FaqSection />

      {/* ── Bottom CTA ─────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden" style={{ backgroundColor: "var(--card)" }}>
        <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2" style={{ width: "800px", height: "400px", background: "radial-gradient(ellipse at center, rgba(74,108,247,0.08) 0%, transparent 70%)" }} />
        <div className="relative mx-auto max-w-[1080px] px-6 py-24 sm:py-28 text-center">
          <h2 style={{ fontFamily: "'A2Z', sans-serif", fontSize: "clamp(1.75rem, 3vw, 2.5rem)", fontWeight: 800, letterSpacing: "-0.025em", lineHeight: 1.15, color: "var(--foreground)" }}>
            Your team is waiting for structure.
          </h2>
          <p className="mt-5 mx-auto max-w-md text-sm" style={{ color: "var(--foreground)", opacity: 0.6, lineHeight: 1.7 }}>Join hundreds of small businesses and developers building structure and driving growth with BossBoard.</p>
          <div className="mt-10">
            <Link href="/signup" className="inline-flex items-center justify-center gap-2.5 rounded-lg px-7 py-4 sm:py-3.5 text-sm font-semibold transition-all duration-200 hover:brightness-110 w-full sm:w-auto max-w-xs mx-auto sm:max-w-none" style={{ backgroundColor: "#4A6CF7", color: "#fff", fontFamily: "'A2Z', sans-serif" }}>
              Get Started Free <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <p className="mt-4 text-xs" style={{ color: "var(--muted-foreground)" }}>No credit card required.</p>
        </div>
      </section>
    </>
  );
}
