import Link from "next/link";
import { PricingToggle } from "@/components/marketing/pricing-toggle";
import { FaqSection } from "@/components/marketing/faq-section";
import { ArrowRight } from "lucide-react";

/* ─── Inline mini-mockup components ───────────────────────────────────────── */

function HeroMockup() {
  const f = "'A2Z', sans-serif";
  const m = "'JetBrains Mono', monospace";
  const bd = "var(--border)";
  const mt = "var(--muted)";
  const mg = "var(--muted-foreground)";
  const fg = "var(--foreground)";
  const bg = "var(--background)";
  const cd = "var(--card)";
  return (
    <div className="rounded-lg overflow-hidden" style={{ backgroundColor: cd, border: `1px solid ${bd}`, boxShadow: "0 24px 64px -16px rgba(0,0,0,0.2)" }}>
      <div className="flex items-center gap-2 border-b px-3 py-2" style={{ borderColor: bd, backgroundColor: bg }}>
        <div className="flex gap-1.5"><div className="h-2 w-2 rounded-full" style={{ backgroundColor: "#FF5F57" }} /><div className="h-2 w-2 rounded-full" style={{ backgroundColor: "#FEBC2E" }} /><div className="h-2 w-2 rounded-full" style={{ backgroundColor: "#28C840" }} /></div>
        <div className="flex-1" />
        <div className="h-3 w-16 rounded" style={{ backgroundColor: mt }} />
      </div>
      <div style={{ display: "flex", minHeight: "320px" }}>
        <div style={{ width: "130px", borderRight: `1px solid ${bd}`, backgroundColor: bg, padding: "10px 8px", flexShrink: 0 }}>
          <div className="flex items-center gap-1.5 mb-3 px-1">
            <div className="h-4 w-4 rounded" style={{ backgroundColor: "#4A6CF7" }} />
            <span style={{ fontSize: "10px", fontWeight: 600, color: fg, fontFamily: f }}>BossBoard</span>
          </div>
          <div className="space-y-0.5">
            {[{ n: "Dashboard", a: false }, { n: "Wiki", a: true }, { n: "Checklists", a: false }, { n: "Calendar", a: false }].map((item) => (
              <div key={item.n} className="flex items-center gap-1.5 rounded px-1.5 py-1" style={{ backgroundColor: item.a ? "rgba(74,108,247,0.1)" : "transparent" }}>
                <div className="h-2.5 w-2.5 rounded" style={{ backgroundColor: item.a ? "#4A6CF7" : bd }} />
                <span style={{ fontSize: "9px", color: item.a ? "#4A6CF7" : mg, fontFamily: f, fontWeight: item.a ? 600 : 400 }}>{item.n}</span>
              </div>
            ))}
            <div className="pt-2 px-1.5 space-y-0.5">
              <span style={{ fontSize: "8px", color: mg, fontFamily: f, textTransform: "uppercase", letterSpacing: "0.05em" }}>Folders</span>
              {["Operations", "Safety", "HR & Training"].map((folder) => (
                <div key={folder} className="flex items-center gap-1 py-0.5">
                  <span style={{ fontSize: "8px", color: mg }}>&#9660;</span>
                  <span style={{ fontSize: "9px", color: fg, fontFamily: f }}>{folder}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={{ flex: 1, padding: "12px 14px" }}>
          <div className="flex gap-2 mb-3">
            {[{ n: "24", l: "Documents", c: "#4A6CF7" }, { n: "89%", l: "Read rate", c: "#34D399" }, { n: "7", l: "Members", c: fg }].map((s) => (
              <div key={s.l} className="flex-1 rounded p-2" style={{ backgroundColor: mt, border: `1px solid ${bd}` }}>
                <div style={{ fontFamily: m, fontSize: "14px", fontWeight: 600, color: s.c, lineHeight: 1 }}>{s.n}</div>
                <div style={{ fontSize: "8px", color: mg, marginTop: "2px" }}>{s.l}</div>
              </div>
            ))}
          </div>
          <div className="rounded" style={{ border: `1px solid ${bd}` }}>
            {[
              { t: "Opening Checklist", type: "SOP", s: "published", c: "#34D399" },
              { t: "Equipment Maintenance", type: "SOP", s: "published", c: "#34D399" },
              { t: "CIP Cleaning Guide", type: "SOP", s: "draft", c: "#FBBF24" },
              { t: "Employee Onboarding", type: "Policy", s: "published", c: "#34D399" },
              { t: "Food Safety Protocol", type: "SOP", s: "published", c: "#34D399" },
            ].map((doc, i) => (
              <div key={doc.t} className="flex items-center gap-2 px-2.5 py-1.5" style={{ borderBottom: i < 4 ? `1px solid ${bd}` : "none" }}>
                <div className="h-2.5 w-2.5 rounded" style={{ backgroundColor: mt, border: `1px solid ${bd}` }} />
                <span style={{ fontSize: "9px", fontFamily: f, color: fg, flex: 1 }}>{doc.t}</span>
                <span style={{ fontSize: "7px", fontFamily: m, color: doc.c, backgroundColor: `${doc.c}15`, padding: "1px 4px", borderRadius: "3px" }}>{doc.s}</span>
                <span style={{ fontSize: "7px", color: mg }}>{doc.type}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureMockAi() {
  const bd = "var(--border)"; const mt = "var(--muted)"; const mg = "var(--muted-foreground)"; const fg = "var(--foreground)"; const f = "'A2Z', sans-serif";
  return (
    <div className="p-5 h-full flex flex-col justify-center gap-3">
      <div className="rounded-md p-3" style={{ border: `1px solid ${bd}`, backgroundColor: mt }}>
        <span style={{ fontSize: "9px", color: mg, fontFamily: f }}>Topic / Task</span>
        <div className="mt-1" style={{ fontSize: "11px", color: fg, fontFamily: f }}>CIP cleaning procedure for brewing tanks</div>
      </div>
      <div className="self-start rounded-md px-3 py-1.5" style={{ backgroundColor: "#4A6CF7", fontSize: "9px", color: "#fff", fontFamily: f, fontWeight: 600 }}>Generate SOP</div>
      <div className="rounded-md p-3 flex-1" style={{ border: `1px solid ${bd}`, borderLeft: "3px solid #4A6CF7" }}>
        <div style={{ fontSize: "10px", fontWeight: 600, color: fg, fontFamily: f }}>CIP Cleaning Procedure</div>
        <div className="mt-2 space-y-1.5">
          {["1. Rinse with water at 60\u00b0C for 5 min", "2. Circulate alkaline solution", "3. Rinse and inspect visually", "4. Sanitize with peracetic acid"].map((s) => (
            <div key={s} style={{ fontSize: "8px", color: mg, fontFamily: f }}>{s}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FeatureMockSearch() {
  const bd = "var(--border)"; const mt = "var(--muted)"; const mg = "var(--muted-foreground)"; const fg = "var(--foreground)"; const f = "'A2Z', sans-serif";
  return (
    <div className="p-5 h-full flex flex-col justify-center gap-3">
      <div className="rounded-md flex items-center gap-2 px-3 py-2" style={{ border: `1px solid ${bd}`, backgroundColor: mt }}>
        <span style={{ fontSize: "10px", color: mg }}>&#128269;</span>
        <span style={{ fontSize: "10px", color: fg, fontFamily: f }}>How often should we clean the tanks?</span>
      </div>
      <div className="rounded-md p-3" style={{ backgroundColor: "rgba(74,108,247,0.05)", border: "1px solid rgba(74,108,247,0.15)" }}>
        <div className="flex items-center gap-1 mb-1.5"><span style={{ fontSize: "8px", color: "#4A6CF7", fontWeight: 600, fontFamily: f }}>AI Answer</span></div>
        <div style={{ fontSize: "9px", color: fg, lineHeight: 1.5, fontFamily: f }}>CIP cleaning should be performed after every brew cycle, typically every 24-48 hours. See &quot;CIP Cleaning Guide&quot; for details.</div>
      </div>
      {["CIP Cleaning Guide", "Equipment Maintenance"].map((t) => (
        <div key={t} className="flex items-center gap-2 rounded-md px-3 py-1.5" style={{ border: `1px solid ${bd}` }}>
          <div className="h-2.5 w-2.5 rounded" style={{ backgroundColor: mt, border: `1px solid ${bd}` }} />
          <span style={{ fontSize: "9px", color: fg, fontFamily: f }}>{t}</span>
        </div>
      ))}
    </div>
  );
}

function FeatureMockChecklist() {
  const bd = "var(--border)"; const mg = "var(--muted-foreground)"; const fg = "var(--foreground)"; const f = "'A2Z', sans-serif"; const m = "'JetBrains Mono', monospace";
  const items = [
    { t: "Pre-heat water to 60\u00b0C", done: true }, { t: "Add alkaline cleaner (2%)", done: true }, { t: "Circulate for 20 minutes", done: true },
    { t: "Rinse with clean water", done: false }, { t: "Sanitize with peracetic acid", done: false }, { t: "Final rinse and visual check", done: false },
  ];
  return (
    <div className="p-5 h-full flex flex-col justify-center">
      <div className="flex items-center justify-between mb-3">
        <span style={{ fontSize: "11px", fontWeight: 600, color: fg, fontFamily: f }}>Daily CIP Checklist</span>
        <span style={{ fontSize: "9px", fontFamily: m, color: "#34D399" }}>3/6</span>
      </div>
      <div className="space-y-1.5">
        {items.map((item) => (
          <div key={item.t} className="flex items-center gap-2">
            <div className="h-3.5 w-3.5 rounded border flex items-center justify-center shrink-0" style={{ borderColor: item.done ? "#34D399" : bd, backgroundColor: item.done ? "rgba(52,211,153,0.1)" : "transparent" }}>
              {item.done && <span style={{ fontSize: "8px", color: "#34D399" }}>&#10003;</span>}
            </div>
            <span style={{ fontSize: "9px", color: item.done ? mg : fg, fontFamily: f, textDecoration: item.done ? "line-through" : "none" }}>{item.t}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 h-1.5 w-full rounded-full" style={{ backgroundColor: "var(--muted)" }}>
        <div className="h-full rounded-full" style={{ width: "50%", backgroundColor: "#34D399" }} />
      </div>
    </div>
  );
}

function FeatureMockDocHub() {
  const bd = "var(--border)"; const mt = "var(--muted)"; const mg = "var(--muted-foreground)"; const fg = "var(--foreground)"; const f = "'A2Z', sans-serif";
  return (
    <div className="p-5 h-full flex flex-col justify-center gap-3">
      <div className="flex items-center gap-3 rounded-md p-3" style={{ border: `1px dashed ${bd}` }}>
        {[{ ext: "PDF", c: "#E74C3C" }, { ext: "DOCX", c: "#2B7CD3" }, { ext: "IMG", c: "#8B5CF6" }].map((file) => (
          <div key={file.ext} className="flex items-center gap-1.5 rounded px-2 py-1.5" style={{ backgroundColor: mt, border: `1px solid ${bd}` }}>
            <div className="h-4 w-4 rounded flex items-center justify-center" style={{ backgroundColor: `${file.c}20` }}>
              <span style={{ fontSize: "6px", fontWeight: 700, color: file.c }}>{file.ext}</span>
            </div>
            <div className="h-2 w-10 rounded" style={{ backgroundColor: bd }} />
          </div>
        ))}
      </div>
      <div className="flex justify-center" style={{ color: "#4A6CF7", fontSize: "14px" }}>&#8595;</div>
      <div className="rounded-md p-3" style={{ border: `1px solid ${bd}`, borderLeft: "3px solid #34D399" }}>
        <div style={{ fontSize: "10px", fontWeight: 600, color: fg, fontFamily: f }}>Structured SOP</div>
        <div className="mt-1.5 space-y-1">
          {["1. Purpose", "2. Scope", "3. Step-by-step procedure", "4. Checklist summary"].map((s) => (
            <div key={s} style={{ fontSize: "8px", color: mg, fontFamily: f }}>{s}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Page ────────────────────────────────────────────────────────────────── */

export default function HomePage() {
  const featureMockups = [<FeatureMockAi key="ai" />, <FeatureMockSearch key="search" />, <FeatureMockChecklist key="cl" />, <FeatureMockDocHub key="doc" />];

  return (
    <>
      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <style>{`
        @keyframes hero-float {
          0%, 100% { transform: perspective(1200px) rotateY(-8deg) rotateX(2deg) translateY(0); }
          50% { transform: perspective(1200px) rotateY(-8deg) rotateX(2deg) translateY(-8px); }
        }
      `}</style>
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2" style={{ width: "900px", height: "600px", background: "radial-gradient(ellipse at center, rgba(74,108,247,0.08) 0%, transparent 70%)" }} />
        <div className="relative mx-auto max-w-[1080px] px-6 pt-24 pb-16 sm:pt-28 sm:pb-20 lg:pt-32 lg:pb-20">
          <div className="flex flex-col lg:flex-row lg:items-center lg:gap-12">
            {/* Left — text */}
            <div className="max-w-2xl lg:max-w-[480px] lg:flex-shrink-0">
              <p className="text-sm font-medium tracking-wide uppercase" style={{ color: "#4A6CF7", fontFamily: "'A2Z', sans-serif", letterSpacing: "0.08em" }}>The Operations Wiki for Small Business</p>
              <h1 className="mt-5" style={{ fontFamily: "'A2Z', sans-serif", fontSize: "clamp(2.75rem, 5.5vw, 4rem)", fontWeight: 700, letterSpacing: "-0.035em", lineHeight: 1.08, color: "var(--foreground)" }}>
                Build structure.<br />Drive growth.
              </h1>
              <p className="mt-6 max-w-lg" style={{ fontFamily: "'A2Z', sans-serif", fontSize: "18px", lineHeight: 1.7, color: "var(--foreground)", fontWeight: 400, opacity: 0.65 }}>
                Stop explaining the same thing twice. BossBoard generates your manuals with AI, organizes every document in one place, and turns SOPs into daily checklists your team actually follows.
              </p>
              <div className="mt-10 flex items-center gap-4">
                <Link href="/signup" className="inline-flex items-center gap-2.5 rounded-lg px-6 py-3 text-sm font-semibold transition-all duration-200 hover:brightness-110" style={{ backgroundColor: "#4A6CF7", color: "#fff", fontFamily: "'A2Z', sans-serif" }}>
                  Start for free <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/#how-it-works" className="text-sm font-medium transition-colors duration-200" style={{ color: "var(--muted-foreground)", fontFamily: "'A2Z', sans-serif" }}>See how it works</Link>
              </div>
              <p className="mt-5 text-xs" style={{ color: "var(--muted-foreground)", fontFamily: "'A2Z', sans-serif", opacity: 0.7 }}>No credit card required. Free for up to 3 team members.</p>
            </div>

            {/* Right — 3D perspective mockup (desktop only) */}
            <div className="hidden lg:block flex-1 min-w-0">
              <div style={{ animation: "hero-float 4s ease-in-out infinite", transformStyle: "preserve-3d" }}>
                <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "#ffffff", boxShadow: "0 25px 60px -12px rgba(0,0,0,0.2), 0 0 0 1px rgba(0,0,0,0.06)" }}>
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
                        { n: "Checklists", a: false },
                        { n: "Todos", a: false },
                        { n: "Search", a: false },
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
      <section className="py-8" style={{ opacity: 0.6 }}>
        <div className="mx-auto max-w-[1080px] px-6">
          <p className="text-center text-xs font-medium uppercase tracking-wide mb-5" style={{ color: "var(--muted-foreground)", fontFamily: "'A2Z', sans-serif", letterSpacing: "0.08em" }}>
            Trusted by small businesses everywhere
          </p>
          <div className="flex flex-wrap justify-center gap-8">
            {["Caf\u00e9", "Brewery", "Restaurant", "Office", "Factory"].map((name) => (
              <div key={name} className="flex items-center justify-center rounded-lg bg-gray-200 dark:bg-gray-700" style={{ width: "100px", height: "40px" }}>
                <span className="text-xs font-medium" style={{ color: "var(--muted-foreground)", fontFamily: "'A2Z', sans-serif" }}>{name}</span>
              </div>
            ))}
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
                {["AI writes your manual in 30 seconds.", "Every document in one searchable place.", "SOPs become daily checklists \u2014 automatically tracked."].map((s) => (
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
            {[{ value: "30s", desc: "Time to generate a full SOP" }, { value: "90%", desc: "Faster than writing from scratch" }, { value: "0", desc: "Knowledge lost to turnover" }].map((s) => (
              <div key={s.value} className="text-center md:text-left">
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "2.5rem", fontWeight: 700, color: "var(--foreground)", letterSpacing: "-0.02em", lineHeight: 1 }}>{s.value}</div>
                <p className="mt-2 text-sm" style={{ color: "var(--muted-foreground)", maxWidth: "260px" }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────────────── */}
      <section id="features" className="mx-auto max-w-[1080px] px-6 py-24 sm:py-32 lg:py-40">
        <div className="max-w-lg">
          <p className="text-sm font-medium uppercase tracking-wide" style={{ color: "#4A6CF7", fontFamily: "'A2Z', sans-serif", letterSpacing: "0.08em" }}>Features</p>
          <h2 className="mt-3" style={{ fontFamily: "'A2Z', sans-serif", fontSize: "clamp(1.75rem, 3vw, 2.5rem)", fontWeight: 700, letterSpacing: "-0.025em", lineHeight: 1.15, color: "var(--foreground)" }}>Everything your team needs — in one place</h2>
        </div>
        <div className="mt-24 space-y-24 lg:space-y-32">
          {[
            { label: "AI Manual Generator", headline: "Describe any task.\nAI writes the manual.", body: "Type a topic or paste existing notes \u2014 BossBoard generates a structured, step-by-step procedure in 30 seconds. Upload PDFs, Word docs, or photos of handwritten notes and AI converts them into clean, searchable documents.", accent: "#4A6CF7" },
            { label: "Smart Search", headline: "Ask questions.\nGet instant answers.", body: "Search across every document instantly with Ctrl+K. Ask questions in plain English and AI finds the answer from your wiki \u2014 with source references.", accent: "#34D399" },
            { label: "Checklists & Tracking", headline: "Convert knowledge\ninto daily action.", body: "Turn any SOP into a daily checklist that resets automatically. Track who completed what in real-time. Overdue items surface on every team member\u2019s dashboard \u2014 nothing falls through the cracks.", accent: "#FBBF24" },
            { label: "Document Hub", headline: "Upload anything.\nAI organizes it.", body: "Upload PDFs, Word docs, or photos of handwritten procedures. AI converts them into clean, structured documents \u2014 while keeping the originals safe.", accent: "#4A6CF7" },
          ].map((feature, i) => (
            <div key={feature.label} className={`flex flex-col gap-8 lg:flex-row lg:gap-16 lg:items-stretch ${i % 2 === 1 ? "lg:flex-row-reverse" : ""}`}>
              <div className="flex-1 lg:max-w-md flex flex-col justify-center">
                <p className="text-xs font-medium uppercase tracking-wide" style={{ color: feature.accent, fontFamily: "'A2Z', sans-serif", letterSpacing: "0.08em" }}>{feature.label}</p>
                <h3 className="mt-3 whitespace-pre-line" style={{ fontFamily: "'A2Z', sans-serif", fontSize: "clamp(1.5rem, 2.5vw, 2rem)", fontWeight: 700, letterSpacing: "-0.025em", lineHeight: 1.15, color: "var(--foreground)" }}>{feature.headline}</h3>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                quote: "BossBoard replaced our entire training process. New hires are productive on day one instead of week three.",
                name: "Operations Manager",
                title: "Food & Beverage",
              },
              {
                quote: "We used to lose a full week training each new barista. Now they just open BossBoard and follow the guide.",
                name: "Caf\u00e9 Owner",
                title: "12 employees",
              },
              {
                quote: "Finally, one place for all our SOPs. No more digging through group chats for that recipe we wrote last year.",
                name: "Kitchen Manager",
                title: "Restaurant Chain",
              },
            ].map((t) => (
              <div
                key={t.name}
                className="rounded-xl p-6 bg-white dark:bg-gray-800 shadow-sm"
                style={{ border: "1px solid var(--border)" }}
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
            <h2 className="mt-3" style={{ fontFamily: "'A2Z', sans-serif", fontSize: "clamp(1.75rem, 3vw, 2.5rem)", fontWeight: 700, letterSpacing: "-0.025em", lineHeight: 1.15, color: "var(--foreground)" }}>From idea to deployed manual in under a minute</h2>
          </div>
          <div className="mt-16 grid gap-0 divide-y" style={{ borderColor: "var(--border)" }}>
            {[
              { step: "01", title: "Describe or upload", desc: "Type a task description, paste your existing notes, or upload a PDF, Word doc, or photo. AI handles any format." },
              { step: "02", title: "AI creates your manual", desc: "Get a structured, professional SOP in 30 seconds — numbered steps, safety notes, extractable checklists." },
              { step: "03", title: "Team follows, you track", desc: "Share with your team, convert to daily checklists, and track completion. One subscription covers everyone." },
            ].map((item) => (
              <div key={item.step} className="flex gap-8 py-10 sm:py-12">
                <div className="shrink-0" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "13px", fontWeight: 500, color: "#4A6CF7", opacity: 0.6 }}>{item.step}</div>
                <div>
                  <h3 style={{ fontFamily: "'A2Z', sans-serif", fontSize: "20px", fontWeight: 600, letterSpacing: "-0.01em", color: "var(--foreground)" }}>{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed max-w-md" style={{ color: "var(--foreground)", opacity: 0.6, lineHeight: 1.7 }}>{item.desc}</p>
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
            <h2 className="mt-3" style={{ fontFamily: "'A2Z', sans-serif", fontSize: "clamp(1.75rem, 3vw, 2.5rem)", fontWeight: 700, letterSpacing: "-0.025em", lineHeight: 1.15, color: "var(--foreground)" }}>Simple, transparent pricing</h2>
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
          <h2 style={{ fontFamily: "'A2Z', sans-serif", fontSize: "clamp(1.75rem, 3vw, 2.5rem)", fontWeight: 700, letterSpacing: "-0.025em", lineHeight: 1.15, color: "var(--foreground)" }}>
            Stop losing knowledge.<br />Start building structure.
          </h2>
          <p className="mt-5 mx-auto max-w-md text-sm" style={{ color: "var(--foreground)", opacity: 0.6, lineHeight: 1.7 }}>Every undocumented process is a risk. Every untrained employee costs you time. BossBoard fixes both — in 30 seconds.</p>
          <div className="mt-10">
            <Link href="/signup" className="inline-flex items-center gap-2.5 rounded-lg px-7 py-3.5 text-sm font-semibold transition-all duration-200 hover:brightness-110" style={{ backgroundColor: "#4A6CF7", color: "#fff", fontFamily: "'A2Z', sans-serif" }}>
              Get Started Free <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <p className="mt-4 text-xs" style={{ color: "var(--muted-foreground)" }}>No credit card required.</p>
        </div>
      </section>
    </>
  );
}
