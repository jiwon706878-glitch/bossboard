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
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2" style={{ width: "900px", height: "600px", background: "radial-gradient(ellipse at center, rgba(74,108,247,0.08) 0%, transparent 70%)" }} />
        <div className="relative mx-auto max-w-[1080px] px-6 pt-32 pb-16 sm:pt-40 sm:pb-20 lg:pt-48 lg:pb-20">
          <div className="max-w-2xl">
            <p className="text-sm font-medium tracking-wide uppercase" style={{ color: "#4A6CF7", fontFamily: "'A2Z', sans-serif", letterSpacing: "0.08em" }}>AI-Powered Business Wiki</p>
            <h1 className="mt-5" style={{ fontFamily: "'A2Z', sans-serif", fontSize: "clamp(2.75rem, 5.5vw, 4rem)", fontWeight: 700, letterSpacing: "-0.035em", lineHeight: 1.08, color: "var(--foreground)" }}>
              Build structure.<br />Drive growth.
            </h1>
            <p className="mt-6 max-w-lg" style={{ fontFamily: "'A2Z', sans-serif", fontSize: "18px", lineHeight: 1.7, color: "var(--muted-foreground)", fontWeight: 400 }}>
              AI-powered operations wiki for teams that move fast. Generate SOPs, track compliance, and scale your business knowledge — in one calm command center.
            </p>
            <div className="mt-10 flex items-center gap-4">
              <Link href="/signup" className="inline-flex items-center gap-2.5 rounded-lg px-6 py-3 text-sm font-semibold transition-all duration-200 hover:brightness-110" style={{ backgroundColor: "#4A6CF7", color: "#fff", fontFamily: "'A2Z', sans-serif" }}>
                Start for free <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/#how-it-works" className="text-sm font-medium transition-colors duration-200" style={{ color: "var(--muted-foreground)", fontFamily: "'A2Z', sans-serif" }}>See how it works</Link>
            </div>
            <p className="mt-5 text-xs" style={{ color: "var(--muted-foreground)", fontFamily: "'A2Z', sans-serif", opacity: 0.7 }}>No credit card required. 5 documents free forever.</p>
          </div>
        </div>
        <div className="mx-auto max-w-[900px] px-6 pb-16 sm:pb-24">
          <HeroMockup />
        </div>
      </section>

      {/* ── Problem → Solution ─────────────────────────────────────────── */}
      <section style={{ backgroundColor: "var(--card)" }}>
        <div className="mx-auto max-w-[1080px] px-6 py-20 sm:py-28">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-20">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--muted-foreground)", fontFamily: "'A2Z', sans-serif", letterSpacing: "0.08em" }}>Sound familiar?</p>
              <div className="mt-6 space-y-5">
                {["New hire? Explain everything from scratch. Again.", "Important docs buried in group chats and random folders.", "Nobody follows the process because nobody can find it."].map((p) => (
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
                {["AI writes your manual in 30 seconds.", "One searchable hub for every document.", "SOPs become daily checklists automatically."].map((s) => (
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
            {[{ value: "30s", desc: "Average time to generate a complete SOP" }, { value: "90%", desc: "Faster than writing procedures from scratch" }, { value: "0", desc: "Knowledge lost to employee turnover" }].map((s) => (
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
          <h2 className="mt-3" style={{ fontFamily: "'A2Z', sans-serif", fontSize: "clamp(1.75rem, 3vw, 2.5rem)", fontWeight: 700, letterSpacing: "-0.025em", lineHeight: 1.15, color: "var(--foreground)" }}>Everything you need to run operations</h2>
        </div>
        <div className="mt-20 space-y-24 lg:space-y-32">
          {[
            { label: "AI Manual Generator", headline: "Describe any task.\nAI writes the manual.", body: "Type a topic or paste existing notes. BossBoard generates a structured, step-by-step procedure in 30 seconds — complete with safety notes, checklists, and numbered steps. Upload PDFs or images and AI converts them too.", accent: "#4A6CF7" },
            { label: "Smart Search", headline: "Ask questions.\nGet instant answers.", body: "Full-text search across all documents with Ctrl+K. Ask natural language questions and AI answers from your wiki — with source references. Wiki-style [[links]] connect related documents.", accent: "#34D399" },
            { label: "Checklists & Tracking", headline: "Convert knowledge\ninto daily action.", body: "Turn any SOP into a recurring daily checklist. Track completion in real-time. Know who read what with digital sign-off. Overdue items surface on every team member's dashboard.", accent: "#FBBF24" },
            { label: "Document Hub", headline: "Upload anything.\nGet structured SOPs.", body: "Upload PDFs, Word docs, or photos of handwritten procedures. AI converts them into clean, searchable documents. The original file is always preserved alongside the structured version.", accent: "#4A6CF7" },
          ].map((feature, i) => (
            <div key={feature.label} className={`flex flex-col gap-8 lg:flex-row lg:gap-16 lg:items-stretch ${i % 2 === 1 ? "lg:flex-row-reverse" : ""}`}>
              <div className="flex-1 lg:max-w-md flex flex-col justify-center">
                <p className="text-xs font-medium uppercase tracking-wide" style={{ color: feature.accent, fontFamily: "'A2Z', sans-serif", letterSpacing: "0.08em" }}>{feature.label}</p>
                <h3 className="mt-3 whitespace-pre-line" style={{ fontFamily: "'A2Z', sans-serif", fontSize: "clamp(1.5rem, 2.5vw, 2rem)", fontWeight: 700, letterSpacing: "-0.025em", lineHeight: 1.15, color: "var(--foreground)" }}>{feature.headline}</h3>
                <p className="mt-4 text-sm leading-relaxed" style={{ color: "var(--muted-foreground)", lineHeight: 1.8 }}>{feature.body}</p>
              </div>
              <div className="flex-1 rounded-lg min-h-[280px]" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", overflow: "hidden" }}>
                {featureMockups[i]}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Testimonial ────────────────────────────────────────────────── */}
      <section style={{ backgroundColor: "var(--card)" }}>
        <div className="mx-auto max-w-[800px] px-6 py-24 sm:py-32 text-center">
          <blockquote>
            <p style={{ fontFamily: "'A2Z', sans-serif", fontSize: "clamp(1.25rem, 2.5vw, 1.75rem)", fontWeight: 400, fontStyle: "italic", lineHeight: 1.5, color: "var(--foreground)", letterSpacing: "-0.01em" }}>
              &ldquo;BossBoard replaced our entire training process. New hires are productive on day one instead of week three.&rdquo;
            </p>
          </blockquote>
          <div className="mt-6">
            <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--foreground)", fontFamily: "'A2Z', sans-serif" }}>Operations Manager</p>
            <p style={{ fontSize: "13px", color: "var(--muted-foreground)", fontFamily: "'A2Z', sans-serif" }}>Food &amp; Beverage Company</p>
          </div>
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
              { step: "01", title: "Describe or upload", desc: "Type a task description, paste existing notes, or upload a PDF/image. AI understands any format." },
              { step: "02", title: "AI creates your manual", desc: "Get a structured, professional SOP in 30 seconds — numbered steps, safety notes, extractable checklists." },
              { step: "03", title: "Team follows, you track", desc: "Share with your team, convert to daily checklists, track who read what, get digital sign-off." },
            ].map((item) => (
              <div key={item.step} className="flex gap-8 py-10 sm:py-12">
                <div className="shrink-0" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "13px", fontWeight: 500, color: "#4A6CF7", opacity: 0.6 }}>{item.step}</div>
                <div>
                  <h3 style={{ fontFamily: "'A2Z', sans-serif", fontSize: "20px", fontWeight: 600, letterSpacing: "-0.01em", color: "var(--foreground)" }}>{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed max-w-md" style={{ color: "var(--muted-foreground)", lineHeight: 1.7 }}>{item.desc}</p>
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
            <p className="mt-3 text-sm" style={{ color: "var(--muted-foreground)" }}>Start free. Upgrade when your team grows.</p>
          </div>
          <div className="mt-14"><PricingToggle /></div>
        </div>
      </section>

      <FaqSection />

      {/* ── Bottom CTA ─────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden" style={{ backgroundColor: "#0C0F17" }}>
        <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2" style={{ width: "800px", height: "400px", background: "radial-gradient(ellipse at center, rgba(74,108,247,0.1) 0%, transparent 70%)" }} />
        <div className="relative mx-auto max-w-[1080px] px-6 py-24 sm:py-32 lg:py-40 text-center">
          <h2 style={{ fontFamily: "'A2Z', sans-serif", fontSize: "clamp(1.75rem, 3vw, 2.5rem)", fontWeight: 700, letterSpacing: "-0.025em", lineHeight: 1.15, color: "#E8ECF4" }}>
            Stop losing knowledge.<br />Start building structure.
          </h2>
          <p className="mt-5 mx-auto max-w-md text-sm" style={{ color: "#8B95B0", lineHeight: 1.7 }}>Every undocumented process is a risk. Every untrained employee is a bottleneck. BossBoard fixes both — in 30 seconds.</p>
          <div className="mt-10">
            <Link href="/signup" className="inline-flex items-center gap-2.5 rounded-lg px-7 py-3.5 text-sm font-semibold transition-all duration-200 hover:brightness-110" style={{ backgroundColor: "#4A6CF7", color: "#fff", fontFamily: "'A2Z', sans-serif" }}>
              Get Started Free <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <p className="mt-4 text-xs" style={{ color: "#5A6480" }}>No credit card required.</p>
        </div>
      </section>
    </>
  );
}
