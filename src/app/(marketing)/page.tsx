import Link from "next/link";
import { PricingToggle } from "@/components/marketing/pricing-toggle";
import { FaqSection } from "@/components/marketing/faq-section";
import { ArrowRight } from "lucide-react";

export default function HomePage() {
  return (
    <>
      {/* Hero Section — Left-aligned, dark, asymmetric */}
      <section
        className="px-4 sm:px-6 lg:px-8"
        style={{
          backgroundColor: "#0C0F17",
          paddingTop: "112px",
          paddingBottom: "96px",
        }}
      >
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-start">
            {/* Left — Text content */}
            <div>
              <h1
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "clamp(2.5rem, 5vw, 3.5rem)",
                  fontWeight: 700,
                  letterSpacing: "-0.02em",
                  lineHeight: 1.1,
                  color: "#E8ECF4",
                }}
              >
                AI Operations
                <br />
                Control Tower for
                <br />
                Business Owners
              </h1>

              <p
                className="mt-6 max-w-lg"
                style={{
                  fontFamily: "'Source Sans 3', sans-serif",
                  fontSize: "18px",
                  lineHeight: 1.6,
                  color: "#8B95B0",
                }}
              >
                AI generates SOPs, manages your team, and gives you a
                bird&apos;s-eye view of operations. Start with just your voice.
              </p>

              <div className="mt-8">
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-2 rounded-md px-6 py-3 text-sm font-semibold transition-colors duration-150"
                  style={{
                    backgroundColor: "#4F8BFF",
                    color: "#FFFFFF",
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  Get Started Free
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              <p
                className="mt-4 text-xs"
                style={{ color: "#5A6480" }}
              >
                No credit card required. Free plan includes 5 SOPs and 5 AI generations per month.
              </p>
            </div>

            {/* Right — Product preview: CSS-only dashboard mockup */}
            <div
              className="hidden lg:block rounded-md overflow-hidden"
              style={{
                backgroundColor: "#141824",
                border: "1px solid #2A3050",
                minHeight: "420px",
                position: "relative",
              }}
            >
              <div style={{ display: "flex", height: "100%", minHeight: "420px" }}>
                {/* Sidebar */}
                <div
                  style={{
                    width: "50px",
                    backgroundColor: "#0C0F17",
                    borderRight: "1px solid #2A3050",
                    padding: "14px 10px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                    flexShrink: 0,
                  }}
                >
                  {/* Logo dot */}
                  <div
                    style={{
                      width: "22px",
                      height: "22px",
                      borderRadius: "4px",
                      backgroundColor: "#4F8BFF",
                      marginBottom: "8px",
                      opacity: 0.8,
                    }}
                  />
                  {/* Nav items */}
                  <div style={{ width: "30px", height: "6px", borderRadius: "3px", backgroundColor: "#4F8BFF", opacity: 0.7 }} />
                  <div style={{ width: "30px", height: "6px", borderRadius: "3px", backgroundColor: "#2A3050" }} />
                  <div style={{ width: "30px", height: "6px", borderRadius: "3px", backgroundColor: "#2A3050" }} />
                  <div style={{ width: "30px", height: "6px", borderRadius: "3px", backgroundColor: "#2A3050" }} />
                  <div style={{ width: "30px", height: "6px", borderRadius: "3px", backgroundColor: "#2A3050" }} />
                </div>

                {/* Main area */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                  {/* Top bar */}
                  <div
                    style={{
                      height: "28px",
                      backgroundColor: "#0C0F17",
                      borderBottom: "1px solid #2A3050",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "0 14px",
                    }}
                  >
                    <div style={{ width: "60px", height: "5px", borderRadius: "2px", backgroundColor: "#2A3050" }} />
                    <div style={{ display: "flex", gap: "6px" }}>
                      <div style={{ width: "14px", height: "5px", borderRadius: "2px", backgroundColor: "#2A3050" }} />
                      <div style={{ width: "14px", height: "14px", borderRadius: "50%", backgroundColor: "#1C2033", border: "1px solid #2A3050" }} />
                    </div>
                  </div>

                  {/* Content */}
                  <div style={{ padding: "16px 18px", flex: 1 }}>
                    {/* Greeting bar */}
                    <div style={{ width: "55%", height: "8px", borderRadius: "4px", backgroundColor: "#2A3050", marginBottom: "4px" }} />
                    <div style={{ width: "30%", height: "5px", borderRadius: "2px", backgroundColor: "#1C2033", marginBottom: "16px" }} />

                    {/* Stat cards row */}
                    <div style={{ display: "flex", gap: "10px", marginBottom: "14px" }}>
                      {/* Wide stat card */}
                      <div
                        style={{
                          flex: "1.4",
                          backgroundColor: "#1C2033",
                          border: "1px solid #2A3050",
                          borderRadius: "6px",
                          padding: "12px",
                        }}
                      >
                        <div style={{ width: "40%", height: "4px", borderRadius: "2px", backgroundColor: "#2A3050", marginBottom: "8px" }} />
                        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "18px", fontWeight: 600, color: "#E8ECF4", lineHeight: 1 }}>24</div>
                        <div style={{ width: "50%", height: "3px", borderRadius: "2px", backgroundColor: "#2A3050", marginTop: "6px" }} />
                      </div>
                      {/* Narrow stat card */}
                      <div
                        style={{
                          flex: "1",
                          backgroundColor: "#1C2033",
                          border: "1px solid #2A3050",
                          borderRadius: "6px",
                          padding: "12px",
                        }}
                      >
                        <div style={{ width: "50%", height: "4px", borderRadius: "2px", backgroundColor: "#2A3050", marginBottom: "8px" }} />
                        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "18px", fontWeight: 600, color: "#34D399", lineHeight: 1 }}>89%</div>
                        <div style={{ width: "60%", height: "3px", borderRadius: "2px", backgroundColor: "#2A3050", marginTop: "6px" }} />
                      </div>
                      {/* Narrow stat card */}
                      <div
                        style={{
                          flex: "0.8",
                          backgroundColor: "#1C2033",
                          border: "1px solid #2A3050",
                          borderRadius: "6px",
                          padding: "12px",
                        }}
                      >
                        <div style={{ width: "55%", height: "4px", borderRadius: "2px", backgroundColor: "#2A3050", marginBottom: "8px" }} />
                        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "18px", fontWeight: 600, color: "#4F8BFF", lineHeight: 1 }}>7</div>
                        <div style={{ width: "45%", height: "3px", borderRadius: "2px", backgroundColor: "#2A3050", marginTop: "6px" }} />
                      </div>
                    </div>

                    {/* AI Insights card with amber left border */}
                    <div
                      style={{
                        backgroundColor: "#1C2033",
                        border: "1px solid #2A3050",
                        borderLeft: "3px solid #FBBF24",
                        borderRadius: "6px",
                        padding: "12px 14px",
                        marginBottom: "14px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                        <div style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#FBBF24" }} />
                        <div style={{ width: "35%", height: "5px", borderRadius: "2px", backgroundColor: "#2A3050" }} />
                      </div>
                      <div style={{ width: "90%", height: "4px", borderRadius: "2px", backgroundColor: "#232840", marginBottom: "5px" }} />
                      <div style={{ width: "70%", height: "4px", borderRadius: "2px", backgroundColor: "#232840" }} />
                    </div>

                    {/* Activity feed lines */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#34D399", flexShrink: 0 }} />
                        <div style={{ width: "75%", height: "4px", borderRadius: "2px", backgroundColor: "#232840" }} />
                        <div style={{ width: "12%", height: "3px", borderRadius: "2px", backgroundColor: "#1C2033", marginLeft: "auto" }} />
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#4F8BFF", flexShrink: 0 }} />
                        <div style={{ width: "60%", height: "4px", borderRadius: "2px", backgroundColor: "#232840" }} />
                        <div style={{ width: "12%", height: "3px", borderRadius: "2px", backgroundColor: "#1C2033", marginLeft: "auto" }} />
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#FBBF24", flexShrink: 0 }} />
                        <div style={{ width: "68%", height: "4px", borderRadius: "2px", backgroundColor: "#232840" }} />
                        <div style={{ width: "12%", height: "3px", borderRadius: "2px", backgroundColor: "#1C2033", marginLeft: "auto" }} />
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#34D399", flexShrink: 0 }} />
                        <div style={{ width: "55%", height: "4px", borderRadius: "2px", backgroundColor: "#232840" }} />
                        <div style={{ width: "12%", height: "3px", borderRadius: "2px", backgroundColor: "#1C2033", marginLeft: "auto" }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section — Alternating layout */}
      <section
        id="features"
        className="px-4 sm:px-6 lg:px-8"
        style={{
          backgroundColor: "#0C0F17",
          paddingTop: "80px",
          paddingBottom: "96px",
          borderTop: "1px solid #2A3050",
        }}
      >
        <div className="mx-auto max-w-5xl">
          <h2
            className="text-3xl font-bold"
            style={{
              color: "#E8ECF4",
              fontFamily: "'DM Sans', sans-serif",
              letterSpacing: "-0.01em",
            }}
          >
            Why BossBoard?
          </h2>
          <p
            className="mt-2 text-base"
            style={{ color: "#8B95B0" }}
          >
            Built for operators who want clarity, not complexity.
          </p>

          {/* Feature 1 — Text left, visual right */}
          <div
            className="mt-16 grid gap-8 lg:grid-cols-2 items-center"
            style={{ paddingBottom: "64px" }}
          >
            <div>
              <span
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: "#4F8BFF" }}
              >
                AI Generation
              </span>
              <h3
                className="mt-2 text-2xl font-semibold"
                style={{
                  color: "#E8ECF4",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                AI SOP Auto-Generation
              </h3>
              <p
                className="mt-3 leading-relaxed"
                style={{
                  color: "#8B95B0",
                  fontSize: "16px",
                }}
              >
                Just type a topic and AI creates a complete, step-by-step SOP
                tailored to your industry. No templates, no guesswork. From
                onboarding procedures to safety protocols, every document is
                ready to deploy.
              </p>
              <ul className="mt-4 space-y-2">
                {[
                  "Industry-specific procedures",
                  "Checklist auto-extraction",
                  "Voice-to-SOP support",
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-2 text-sm"
                    style={{ color: "#8B95B0" }}
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: "#4F8BFF" }}
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div
              className="rounded-md h-64 lg:h-72 overflow-hidden"
              style={{
                backgroundColor: "#141824",
                border: "1px solid #2A3050",
                padding: "20px",
              }}
            >
              {/* Mini SOP generation form */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                <span style={{ fontFamily: "'Source Sans 3', sans-serif", fontSize: "12px", color: "#8B95B0", flexShrink: 0 }}>Topic:</span>
                <div style={{ flex: 1, height: "28px", backgroundColor: "#1C2033", border: "1px solid #2A3050", borderRadius: "4px", padding: "0 10px", display: "flex", alignItems: "center" }}>
                  <span style={{ fontFamily: "'Source Sans 3', sans-serif", fontSize: "11px", color: "#5A6480" }}>Enter your topic...</span>
                </div>
              </div>
              <div style={{ marginBottom: "16px" }}>
                <div style={{ display: "inline-block", backgroundColor: "#4F8BFF", borderRadius: "4px", padding: "5px 14px" }}>
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "11px", fontWeight: 600, color: "#FFFFFF" }}>Generate SOP</span>
                </div>
              </div>
              {/* Generated steps */}
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "14px" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", fontWeight: 500, color: "#4F8BFF" }}>1.</span>
                    <span style={{ fontFamily: "'Source Sans 3', sans-serif", fontSize: "11px", color: "#8B95B0" }}>Purpose</span>
                  </div>
                  <div style={{ marginLeft: "18px", height: "3px", width: "70%", backgroundColor: "#2A3050", borderRadius: "2px" }} />
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", fontWeight: 500, color: "#4F8BFF" }}>2.</span>
                    <span style={{ fontFamily: "'Source Sans 3', sans-serif", fontSize: "11px", color: "#8B95B0" }}>Procedure</span>
                  </div>
                  <div style={{ marginLeft: "18px", height: "3px", width: "80%", backgroundColor: "#232840", borderRadius: "2px" }} />
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", fontWeight: 500, color: "#4F8BFF" }}>3.</span>
                    <span style={{ fontFamily: "'Source Sans 3', sans-serif", fontSize: "11px", color: "#8B95B0" }}>Safety Notes</span>
                  </div>
                  <div style={{ marginLeft: "18px", height: "3px", width: "60%", backgroundColor: "#2A3050", borderRadius: "2px" }} />
                </div>
              </div>
              {/* Checklist items */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ fontFamily: "'Source Sans 3', sans-serif", fontSize: "12px", color: "#34D399", fontWeight: 600 }}>&#10003;</span>
                  <span style={{ fontFamily: "'Source Sans 3', sans-serif", fontSize: "11px", color: "#8B95B0" }}>Checklist item 1</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ fontFamily: "'Source Sans 3', sans-serif", fontSize: "12px", color: "#34D399", fontWeight: 600 }}>&#10003;</span>
                  <span style={{ fontFamily: "'Source Sans 3', sans-serif", fontSize: "11px", color: "#8B95B0" }}>Checklist item 2</span>
                </div>
              </div>
            </div>
          </div>

          {/* Feature 2 — Visual left, text right */}
          <div
            className="grid gap-8 lg:grid-cols-2 items-center"
            style={{ paddingBottom: "80px" }}
          >
            <div
              className="rounded-md h-64 lg:h-72 order-2 lg:order-1 overflow-hidden"
              style={{
                backgroundColor: "#141824",
                border: "1px solid #2A3050",
                padding: "20px",
              }}
            >
              {/* Mini stat cards row */}
              <div style={{ display: "flex", gap: "10px", marginBottom: "14px" }}>
                <div style={{ flex: 1, backgroundColor: "#1C2033", border: "1px solid #2A3050", borderRadius: "6px", padding: "12px" }}>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "22px", fontWeight: 700, color: "#E8ECF4", lineHeight: 1 }}>12</div>
                  <div style={{ fontFamily: "'Source Sans 3', sans-serif", fontSize: "11px", color: "#8B95B0", marginTop: "4px" }}>members</div>
                </div>
                <div style={{ flex: 1, backgroundColor: "#1C2033", border: "1px solid #2A3050", borderRadius: "6px", padding: "12px" }}>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "22px", fontWeight: 700, color: "#34D399", lineHeight: 1 }}>94%</div>
                  <div style={{ fontFamily: "'Source Sans 3', sans-serif", fontSize: "11px", color: "#8B95B0", marginTop: "4px" }}>read</div>
                </div>
              </div>
              {/* Team member progress list */}
              <div style={{ backgroundColor: "#1C2033", border: "1px solid #2A3050", borderRadius: "6px", padding: "14px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {/* John */}
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#4F8BFF", flexShrink: 0 }} />
                    <span style={{ fontFamily: "'Source Sans 3', sans-serif", fontSize: "11px", color: "#8B95B0", width: "40px", flexShrink: 0 }}>John</span>
                    <div style={{ flex: 1, height: "6px", backgroundColor: "#232840", borderRadius: "3px", overflow: "hidden" }}>
                      <div style={{ width: "100%", height: "100%", backgroundColor: "#34D399", borderRadius: "3px" }} />
                    </div>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", color: "#8B95B0", flexShrink: 0 }}>100%</span>
                  </div>
                  {/* Sarah */}
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#FBBF24", flexShrink: 0 }} />
                    <span style={{ fontFamily: "'Source Sans 3', sans-serif", fontSize: "11px", color: "#8B95B0", width: "40px", flexShrink: 0 }}>Sarah</span>
                    <div style={{ flex: 1, height: "6px", backgroundColor: "#232840", borderRadius: "3px", overflow: "hidden" }}>
                      <div style={{ width: "75%", height: "100%", backgroundColor: "#4F8BFF", borderRadius: "3px" }} />
                    </div>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", color: "#8B95B0", flexShrink: 0 }}>75%</span>
                  </div>
                  {/* Mike */}
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#34D399", flexShrink: 0 }} />
                    <span style={{ fontFamily: "'Source Sans 3', sans-serif", fontSize: "11px", color: "#8B95B0", width: "40px", flexShrink: 0 }}>Mike</span>
                    <div style={{ flex: 1, height: "6px", backgroundColor: "#232840", borderRadius: "3px", overflow: "hidden" }}>
                      <div style={{ width: "50%", height: "100%", backgroundColor: "#4F8BFF", borderRadius: "3px" }} />
                    </div>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", color: "#8B95B0", flexShrink: 0 }}>50%</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <span
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: "#34D399" }}
              >
                Team Management
              </span>
              <h3
                className="mt-2 text-2xl font-semibold"
                style={{
                  color: "#E8ECF4",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                Team Operations Dashboard
              </h3>
              <p
                className="mt-3 leading-relaxed"
                style={{
                  color: "#8B95B0",
                  fontSize: "16px",
                }}
              >
                See who read what, track checklist completion rates, and
                monitor onboarding progress — all in one calm, organized
                view. No more chasing people for updates.
              </p>
              <ul className="mt-4 space-y-2">
                {[
                  "Read tracking & sign-off",
                  "Checklist progress monitoring",
                  "Onboarding path builder",
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-2 text-sm"
                    style={{ color: "#8B95B0" }}
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: "#34D399" }}
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Feature 3 — Text left, visual right */}
          <div className="grid gap-8 lg:grid-cols-2 items-center">
            <div>
              <span
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: "#FBBF24" }}
              >
                AI Insights
              </span>
              <h3
                className="mt-2 text-2xl font-semibold"
                style={{
                  color: "#E8ECF4",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                Real-time Operations Insights
              </h3>
              <p
                className="mt-3 leading-relaxed"
                style={{
                  color: "#8B95B0",
                  fontSize: "16px",
                }}
              >
                AI analyzes your operational patterns and surfaces improvement
                recommendations. Know which SOPs need review, which team
                members need attention, and where bottlenecks are forming.
              </p>
              <ul className="mt-4 space-y-2">
                {[
                  "Pattern analysis & recommendations",
                  "SOP review cycle alerts",
                  "Team performance signals",
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-2 text-sm"
                    style={{ color: "#8B95B0" }}
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: "#FBBF24" }}
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div
              className="rounded-md h-64 lg:h-72 overflow-hidden"
              style={{
                backgroundColor: "#141824",
                border: "1px solid #2A3050",
                borderLeft: "3px solid #FBBF24",
                padding: "20px",
              }}
            >
              {/* Insight items */}
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {/* Amber insight */}
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                    <div style={{ width: "7px", height: "7px", borderRadius: "50%", backgroundColor: "#FBBF24", flexShrink: 0 }} />
                    <span style={{ fontFamily: "'Source Sans 3', sans-serif", fontSize: "12px", color: "#E8ECF4" }}>3 SOPs need review</span>
                  </div>
                  <div style={{ marginLeft: "15px", height: "3px", width: "75%", backgroundColor: "#232840", borderRadius: "2px" }} />
                </div>
                {/* Green insight */}
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                    <div style={{ width: "7px", height: "7px", borderRadius: "50%", backgroundColor: "#34D399", flexShrink: 0 }} />
                    <span style={{ fontFamily: "'Source Sans 3', sans-serif", fontSize: "12px", color: "#E8ECF4" }}>Team completion: 87%</span>
                  </div>
                  <div style={{ marginLeft: "15px", height: "3px", width: "60%", backgroundColor: "#232840", borderRadius: "2px" }} />
                </div>
                {/* Blue insight */}
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                    <div style={{ width: "7px", height: "7px", borderRadius: "50%", backgroundColor: "#4F8BFF", flexShrink: 0 }} />
                    <span style={{ fontFamily: "'Source Sans 3', sans-serif", fontSize: "12px", color: "#E8ECF4" }}>New hire onboarding started</span>
                  </div>
                  <div style={{ marginLeft: "15px", height: "3px", width: "85%", backgroundColor: "#232840", borderRadius: "2px" }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section
        className="px-4 sm:px-6 lg:px-8"
        style={{
          backgroundColor: "#0C0F17",
          paddingTop: "64px",
          paddingBottom: "80px",
          borderTop: "1px solid #2A3050",
        }}
      >
        <div className="mx-auto max-w-5xl">
          <h2
            className="text-center text-2xl font-bold"
            style={{
              color: "#E8ECF4",
              fontFamily: "'DM Sans', sans-serif",
              letterSpacing: "-0.01em",
            }}
          >
            Built for teams who refuse to lose knowledge
          </h2>

          {/* Stats — NOT identical cards, vary widths */}
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            <div
              className="rounded-md p-6 text-center"
              style={{ backgroundColor: "#141824", border: "1px solid #2A3050" }}
            >
              <div
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "2rem",
                  fontWeight: 700,
                  color: "#4F8BFF",
                }}
              >
                90%
              </div>
              <p className="mt-2 text-sm" style={{ color: "#8B95B0" }}>
                faster SOP creation vs. manual writing
              </p>
            </div>
            <div
              className="rounded-md p-6 text-center"
              style={{ backgroundColor: "#141824", border: "1px solid #2A3050" }}
            >
              <div
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "2rem",
                  fontWeight: 700,
                  color: "#34D399",
                }}
              >
                30s
              </div>
              <p className="mt-2 text-sm" style={{ color: "#8B95B0" }}>
                to generate your first SOP with AI
              </p>
            </div>
            <div
              className="rounded-md p-6 text-center"
              style={{ backgroundColor: "#141824", border: "1px solid #2A3050" }}
            >
              <div
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "2rem",
                  fontWeight: 700,
                  color: "#FBBF24",
                }}
              >
                0
              </div>
              <p className="mt-2 text-sm" style={{ color: "#8B95B0" }}>
                knowledge lost to employee turnover
              </p>
            </div>
          </div>

          <p
            className="mt-10 text-center text-sm"
            style={{ color: "#5A6480" }}
          >
            Join 50+ teams already streamlining their operations with BossBoard
          </p>
        </div>
      </section>

      {/* How It Works */}
      <section
        id="how-it-works"
        className="px-4 sm:px-6 lg:px-8"
        style={{
          backgroundColor: "#0C0F17",
          paddingTop: "96px",
          paddingBottom: "80px",
          borderTop: "1px solid #2A3050",
        }}
      >
        <div className="mx-auto max-w-3xl">
          <h2
            className="text-3xl font-bold"
            style={{
              color: "#E8ECF4",
              fontFamily: "'DM Sans', sans-serif",
              letterSpacing: "-0.01em",
            }}
          >
            How it works
          </h2>
          <p
            className="mt-2 text-base"
            style={{ color: "#8B95B0" }}
          >
            From idea to deployed SOP in under a minute.
          </p>

          <div className="mt-12 space-y-0">
            {[
              {
                step: "01",
                title: "Describe your topic",
                desc: "Type or speak the SOP topic. Tell the AI what procedure you need documented.",
                accent: "#4F8BFF",
              },
              {
                step: "02",
                title: "AI writes the SOP",
                desc: "The AI generates a detailed, step-by-step manual tailored to your industry with safety notes and checklists.",
                accent: "#34D399",
              },
              {
                step: "03",
                title: "Share with your team",
                desc: "One-click publish. Track who reads it, auto-generate checklists, and build onboarding paths.",
                accent: "#FBBF24",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="flex gap-6 py-8"
                style={{
                  borderBottom: "1px solid #1C2033",
                }}
              >
                <div
                  className="shrink-0 pt-1"
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "14px",
                    fontWeight: 500,
                    color: item.accent,
                  }}
                >
                  {item.step}
                </div>
                <div
                  style={{
                    borderLeft: `2px solid ${item.accent}`,
                    paddingLeft: "20px",
                  }}
                >
                  <h3
                    className="text-lg font-semibold"
                    style={{
                      color: "#E8ECF4",
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    {item.title}
                  </h3>
                  <p
                    className="mt-1.5 text-sm leading-relaxed"
                    style={{ color: "#8B95B0" }}
                  >
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section
        id="pricing"
        className="px-4 sm:px-6 lg:px-8"
        style={{
          backgroundColor: "#0C0F17",
          paddingTop: "80px",
          paddingBottom: "96px",
          borderTop: "1px solid #2A3050",
        }}
      >
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <h2
              className="text-3xl font-bold"
              style={{
                color: "#E8ECF4",
                fontFamily: "'DM Sans', sans-serif",
                letterSpacing: "-0.01em",
              }}
            >
              Simple, transparent pricing
            </h2>
            <p
              className="mt-2 text-base"
              style={{ color: "#8B95B0" }}
            >
              Start free. Upgrade when you&apos;re ready.
            </p>
          </div>
          <div className="mt-12">
            <PricingToggle />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <FaqSection />

      {/* Bottom CTA */}
      <section
        className="px-4 sm:px-6 lg:px-8"
        style={{
          backgroundColor: "#0C0F17",
          paddingTop: "64px",
          paddingBottom: "128px",
          borderTop: "1px solid #2A3050",
        }}
      >
        <div className="mx-auto max-w-2xl text-center">
          <h2
            className="text-3xl font-bold"
            style={{
              color: "#E8ECF4",
              fontFamily: "'DM Sans', sans-serif",
              letterSpacing: "-0.01em",
            }}
          >
            Ready to streamline your operations?
          </h2>
          <p
            className="mt-3 leading-relaxed"
            style={{
              color: "#8B95B0",
              fontSize: "16px",
            }}
          >
            Create your first AI-generated SOP in under a minute.
            No credit card required.
          </p>
          <div className="mt-8">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-md px-6 py-3 text-sm font-semibold transition-colors duration-150"
              style={{
                backgroundColor: "#4F8BFF",
                color: "#FFFFFF",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Get Started Free
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
