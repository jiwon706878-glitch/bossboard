import Link from "next/link";
import { PricingToggle } from "@/components/marketing/pricing-toggle";
import { FaqSection } from "@/components/marketing/faq-section";
import { CountdownTimer } from "@/components/marketing/countdown-timer";
import { WaitlistForm } from "@/components/marketing/waitlist-form";
import { ArrowRight } from "lucide-react";

export default function HomePage() {
  return (
    <>
      {/* Hero Section — Left-aligned, dark, asymmetric */}
      <section
        id="waitlist"
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
              <div
                className="inline-flex items-center rounded-md px-3 py-1 text-xs font-medium mb-6"
                style={{
                  backgroundColor: "rgba(251, 191, 36, 0.1)",
                  color: "#FBBF24",
                  border: "1px solid rgba(251, 191, 36, 0.2)",
                }}
              >
                First 100 signups get 1 month free Pro
              </div>

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
                  href="#waitlist-form"
                  className="inline-flex items-center gap-2 rounded-md px-6 py-3 text-sm font-semibold transition-colors duration-150"
                  style={{
                    backgroundColor: "#4F8BFF",
                    color: "#FFFFFF",
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  Join the Waitlist
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              <div className="mt-10">
                <p
                  className="text-xs font-medium mb-3"
                  style={{ color: "#5A6480" }}
                >
                  LAUNCHING IN
                </p>
                <CountdownTimer />
              </div>
            </div>

            {/* Right — Product preview placeholder */}
            <div
              className="hidden lg:block rounded-md overflow-hidden"
              style={{
                backgroundColor: "#141824",
                border: "1px solid #2A3050",
                minHeight: "420px",
                position: "relative",
              }}
            >
              <div
                className="absolute inset-0 flex items-center justify-center"
                style={{ color: "#2A3050" }}
              >
                <div className="text-center">
                  {/* Simulated dashboard skeleton */}
                  <div className="space-y-3 p-8">
                    {/* Top bar */}
                    <div
                      className="h-8 rounded"
                      style={{ backgroundColor: "#1C2033", width: "100%" }}
                    />
                    {/* Content area */}
                    <div className="grid grid-cols-3 gap-3">
                      <div
                        className="h-20 rounded"
                        style={{ backgroundColor: "#1C2033" }}
                      />
                      <div
                        className="h-20 rounded"
                        style={{ backgroundColor: "#1C2033" }}
                      />
                      <div
                        className="h-20 rounded"
                        style={{ backgroundColor: "#1C2033" }}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div
                        className="h-32 rounded"
                        style={{ backgroundColor: "#1C2033" }}
                      />
                      <div
                        className="h-32 rounded"
                        style={{ backgroundColor: "#1C2033" }}
                      />
                    </div>
                    <div
                      className="h-24 rounded"
                      style={{ backgroundColor: "#1C2033" }}
                    />
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
              className="rounded-md h-64 lg:h-72"
              style={{
                backgroundColor: "#141824",
                border: "1px solid #2A3050",
              }}
            />
          </div>

          {/* Feature 2 — Visual left, text right */}
          <div
            className="grid gap-8 lg:grid-cols-2 items-center"
            style={{ paddingBottom: "80px" }}
          >
            <div
              className="rounded-md h-64 lg:h-72 order-2 lg:order-1"
              style={{
                backgroundColor: "#141824",
                border: "1px solid #2A3050",
              }}
            />
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
              className="rounded-md h-64 lg:h-72"
              style={{
                backgroundColor: "#141824",
                border: "1px solid #2A3050",
              }}
            />
          </div>
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

      {/* Waitlist CTA */}
      <section
        id="waitlist-form"
        className="px-4 sm:px-6 lg:px-8"
        style={{
          backgroundColor: "#0C0F17",
          paddingTop: "64px",
          paddingBottom: "128px",
          borderTop: "1px solid #2A3050",
        }}
      >
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-10 lg:grid-cols-2 items-start">
            <div>
              <h2
                className="text-3xl font-bold"
                style={{
                  color: "#E8ECF4",
                  fontFamily: "'DM Sans', sans-serif",
                  letterSpacing: "-0.01em",
                }}
              >
                Don&apos;t miss launch day
              </h2>
              <p
                className="mt-3 leading-relaxed"
                style={{
                  color: "#8B95B0",
                  fontSize: "16px",
                }}
              >
                Join the waitlist now and be among the first to access
                AI-powered operations tools that save you time, keep your team
                aligned, and give you a daily reason to open BossBoard.
              </p>
              <div
                className="mt-6 space-y-3"
              >
                {[
                  "Early access before public launch",
                  "Free Pro plan for first 100 signups",
                  "Direct input on features we build",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-2 text-sm"
                    style={{ color: "#8B95B0" }}
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: "#34D399" }}
                    />
                    {item}
                  </div>
                ))}
              </div>
            </div>
            <WaitlistForm />
          </div>
        </div>
      </section>
    </>
  );
}
