import Link from "next/link";
import { PricingToggle } from "@/components/marketing/pricing-toggle";
import { FaqSection } from "@/components/marketing/faq-section";
import {
  ArrowRight,
  Sparkles,
  Upload,
  FolderTree,
  CheckSquare,
  Eye,
  Bell,
} from "lucide-react";

const FEATURES = [
  {
    icon: Sparkles,
    title: "AI Manual Generator",
    desc: "Describe any task, AI creates a complete step-by-step manual in 30 seconds.",
    accent: "#4F8BFF",
  },
  {
    icon: Upload,
    title: "Upload & Reformat",
    desc: "Already have documents? Upload TXT, MD, DOCX, PDF files and AI restructures them.",
    accent: "#34D399",
  },
  {
    icon: FolderTree,
    title: "Wiki Folders",
    desc: "Organize everything in folders: Operations, Recipes, Safety, HR. Search across all documents instantly.",
    accent: "#FBBF24",
  },
  {
    icon: CheckSquare,
    title: "Daily Checklists",
    desc: "Convert any manual into a repeating checklist your team completes every day. Track completion in real-time.",
    accent: "#4F8BFF",
  },
  {
    icon: Eye,
    title: "Read Tracking & Sign-off",
    desc: "Know exactly who read what. Get digital signatures for compliance.",
    accent: "#34D399",
  },
  {
    icon: Bell,
    title: "Team Notifications",
    desc: "Dashboard alerts for due checklists, unread documents, and team activity. No email spam.",
    accent: "#FBBF24",
  },
];

export default function HomePage() {
  return (
    <>
      {/* Hero Section */}
      <section
        className="px-4 sm:px-6 lg:px-8"
        style={{
          backgroundColor: "var(--background)",
          paddingTop: "112px",
          paddingBottom: "96px",
        }}
      >
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-start">
            <div className="space-y-8">
              <h1
                className="max-w-2xl"
                style={{
                  fontFamily: "'A2Z', sans-serif",
                  fontSize: "clamp(2.5rem, 5vw, 3.5rem)",
                  fontWeight: 700,
                  letterSpacing: "-0.02em",
                  lineHeight: 1.15,
                  color: "var(--foreground)",
                }}
              >
                Your Business Manual,
                <br />
                Built by AI
              </h1>

              <p
                className="max-w-xl leading-relaxed"
                style={{
                  fontFamily: "'A2Z', sans-serif",
                  fontSize: "18px",
                  lineHeight: 1.7,
                  color: "var(--muted-foreground)",
                  fontWeight: 400,
                }}
              >
                Create operation manuals, checklists, and team procedures in
                30 seconds. AI writes it. Your team follows it. You track
                everything.
              </p>

              <div>
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-2 rounded-md px-7 py-3.5 text-sm font-semibold transition-colors duration-150"
                  style={{
                    backgroundColor: "#4F8BFF",
                    color: "var(--primary-foreground)",
                    fontFamily: "'A2Z', sans-serif",
                  }}
                >
                  Get Started Free
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              <p
                className="text-xs"
                style={{ color: "var(--muted-foreground)", fontFamily: "'A2Z', sans-serif" }}
              >
                No credit card required. Free plan includes 5 documents and 5 AI generations per month.
              </p>
            </div>

            {/* Product preview mockup */}
            <div
              className="hidden lg:block rounded-md overflow-hidden"
              style={{
                backgroundColor: "var(--card)",
                border: "1px solid var(--border)",
                minHeight: "420px",
                position: "relative",
              }}
            >
              <div style={{ display: "flex", height: "100%", minHeight: "420px" }}>
                {/* Sidebar */}
                <div
                  style={{
                    width: "50px",
                    backgroundColor: "var(--background)",
                    borderRight: "1px solid #2A3050",
                    padding: "14px 10px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                    flexShrink: 0,
                  }}
                >
                  <div style={{ width: "22px", height: "22px", borderRadius: "4px", backgroundColor: "#4F8BFF", marginBottom: "8px", opacity: 0.8 }} />
                  <div style={{ width: "30px", height: "6px", borderRadius: "3px", backgroundColor: "#4F8BFF", opacity: 0.7 }} />
                  <div style={{ width: "30px", height: "6px", borderRadius: "3px", backgroundColor: "#2A3050" }} />
                  <div style={{ width: "30px", height: "6px", borderRadius: "3px", backgroundColor: "#2A3050" }} />
                  <div style={{ width: "30px", height: "6px", borderRadius: "3px", backgroundColor: "#2A3050" }} />
                </div>
                {/* Main */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                  <div style={{ height: "28px", backgroundColor: "var(--background)", borderBottom: "1px solid #2A3050", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 14px" }}>
                    <div style={{ width: "60px", height: "5px", borderRadius: "2px", backgroundColor: "#2A3050" }} />
                    <div style={{ display: "flex", gap: "6px" }}>
                      <div style={{ width: "14px", height: "5px", borderRadius: "2px", backgroundColor: "#2A3050" }} />
                      <div style={{ width: "14px", height: "14px", borderRadius: "50%", backgroundColor: "#1C2033", border: "1px solid var(--border)" }} />
                    </div>
                  </div>
                  <div style={{ padding: "16px 18px", flex: 1 }}>
                    <div style={{ width: "55%", height: "8px", borderRadius: "4px", backgroundColor: "#2A3050", marginBottom: "4px" }} />
                    <div style={{ width: "30%", height: "5px", borderRadius: "2px", backgroundColor: "#1C2033", marginBottom: "16px" }} />
                    <div style={{ display: "flex", gap: "10px", marginBottom: "14px" }}>
                      <div style={{ flex: 1.4, backgroundColor: "#1C2033", border: "1px solid var(--border)", borderRadius: "6px", padding: "12px" }}>
                        <div style={{ width: "40%", height: "4px", borderRadius: "2px", backgroundColor: "#2A3050", marginBottom: "8px" }} />
                        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "18px", fontWeight: 600, color: "var(--foreground)", lineHeight: 1 }}>24</div>
                        <div style={{ width: "50%", height: "3px", borderRadius: "2px", backgroundColor: "#2A3050", marginTop: "6px" }} />
                      </div>
                      <div style={{ flex: 1, backgroundColor: "#1C2033", border: "1px solid var(--border)", borderRadius: "6px", padding: "12px" }}>
                        <div style={{ width: "50%", height: "4px", borderRadius: "2px", backgroundColor: "#2A3050", marginBottom: "8px" }} />
                        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "18px", fontWeight: 600, color: "#34D399", lineHeight: 1 }}>89%</div>
                        <div style={{ width: "60%", height: "3px", borderRadius: "2px", backgroundColor: "#2A3050", marginTop: "6px" }} />
                      </div>
                      <div style={{ flex: 0.8, backgroundColor: "#1C2033", border: "1px solid var(--border)", borderRadius: "6px", padding: "12px" }}>
                        <div style={{ width: "55%", height: "4px", borderRadius: "2px", backgroundColor: "#2A3050", marginBottom: "8px" }} />
                        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "18px", fontWeight: 600, color: "#4F8BFF", lineHeight: 1 }}>7</div>
                        <div style={{ width: "45%", height: "3px", borderRadius: "2px", backgroundColor: "#2A3050", marginTop: "6px" }} />
                      </div>
                    </div>
                    <div style={{ backgroundColor: "#1C2033", border: "1px solid var(--border)", borderLeft: "3px solid #FBBF24", borderRadius: "6px", padding: "12px 14px", marginBottom: "14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                        <div style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#FBBF24" }} />
                        <div style={{ width: "35%", height: "5px", borderRadius: "2px", backgroundColor: "#2A3050" }} />
                      </div>
                      <div style={{ width: "90%", height: "4px", borderRadius: "2px", backgroundColor: "#232840", marginBottom: "5px" }} />
                      <div style={{ width: "70%", height: "4px", borderRadius: "2px", backgroundColor: "#232840" }} />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {["#34D399", "#4F8BFF", "#FBBF24", "#34D399"].map((color, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <div style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: color, flexShrink: 0 }} />
                          <div style={{ width: `${75 - i * 7}%`, height: "4px", borderRadius: "2px", backgroundColor: "#232840" }} />
                          <div style={{ width: "12%", height: "3px", borderRadius: "2px", backgroundColor: "#1C2033", marginLeft: "auto" }} />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof + Stats */}
      <section
        className="px-4 sm:px-6 lg:px-8"
        style={{
          backgroundColor: "var(--background)",
          paddingTop: "64px",
          paddingBottom: "80px",
          borderTop: "1px solid var(--border)",
        }}
      >
        <div className="mx-auto max-w-5xl">
          <h2
            className="text-center text-2xl font-bold"
            style={{ color: "var(--foreground)", fontFamily: "'A2Z', sans-serif", letterSpacing: "-0.01em" }}
          >
            Built for teams who refuse to lose knowledge
          </h2>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              { value: "90%", label: "faster manual creation vs. writing from scratch", color: "#4F8BFF" },
              { value: "30s", label: "to generate a complete operations manual", color: "#34D399" },
              { value: "0", label: "knowledge lost to employee turnover", color: "#FBBF24" },
            ].map((stat) => (
              <div
                key={stat.value}
                className="rounded-md p-6 text-center"
                style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
              >
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "2rem", fontWeight: 700, color: stat.color }}>
                  {stat.value}
                </div>
                <p className="mt-2 text-sm" style={{ color: "var(--muted-foreground)" }}>{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section — 2x3 Grid */}
      <section
        id="features"
        className="px-4 sm:px-6 lg:px-8"
        style={{
          backgroundColor: "var(--background)",
          paddingTop: "80px",
          paddingBottom: "96px",
          borderTop: "1px solid var(--border)",
        }}
      >
        <div className="mx-auto max-w-5xl">
          <h2
            className="text-3xl font-bold"
            style={{ color: "var(--foreground)", fontFamily: "'A2Z', sans-serif", letterSpacing: "-0.01em" }}
          >
            Everything you need to run operations
          </h2>
          <p className="mt-2 text-base" style={{ color: "var(--muted-foreground)" }}>
            From AI generation to daily execution and tracking.
          </p>

          <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="rounded-md p-6"
                  style={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-md"
                    style={{ backgroundColor: `${feature.accent}15` }}
                  >
                    <Icon className="h-5 w-5" style={{ color: feature.accent }} />
                  </div>
                  <h3
                    className="mt-4 text-base font-semibold"
                    style={{ color: "var(--foreground)", fontFamily: "'A2Z', sans-serif" }}
                  >
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
                    {feature.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section
        id="how-it-works"
        className="px-4 sm:px-6 lg:px-8"
        style={{
          backgroundColor: "var(--background)",
          paddingTop: "96px",
          paddingBottom: "80px",
          borderTop: "1px solid var(--border)",
        }}
      >
        <div className="mx-auto max-w-3xl">
          <h2
            className="text-3xl font-bold"
            style={{ color: "var(--foreground)", fontFamily: "'A2Z', sans-serif", letterSpacing: "-0.01em" }}
          >
            How it works
          </h2>
          <p className="mt-2 text-base" style={{ color: "var(--muted-foreground)" }}>
            From idea to deployed manual in under a minute.
          </p>

          <div className="mt-12 space-y-0">
            {[
              {
                step: "01",
                title: "Describe or Upload",
                desc: "Type a task description or upload your existing documents. Supports TXT, DOCX, PDF, and more.",
                accent: "#4F8BFF",
              },
              {
                step: "02",
                title: "AI Creates Your Manual",
                desc: "Get a structured, professional manual in 30 seconds — with numbered steps, safety notes, and extractable checklists.",
                accent: "#34D399",
              },
              {
                step: "03",
                title: "Team Follows & You Track",
                desc: "Share with your team, convert to daily checklists, track who read what, and get sign-off for compliance.",
                accent: "#FBBF24",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="flex gap-6 py-8"
                style={{ borderBottom: "1px solid #1C2033" }}
              >
                <div
                  className="shrink-0 pt-1"
                  style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "14px", fontWeight: 500, color: item.accent }}
                >
                  {item.step}
                </div>
                <div style={{ borderLeft: `2px solid ${item.accent}`, paddingLeft: "20px" }}>
                  <h3
                    className="text-lg font-semibold"
                    style={{ color: "var(--foreground)", fontFamily: "'A2Z', sans-serif" }}
                  >
                    {item.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
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
          backgroundColor: "var(--background)",
          paddingTop: "80px",
          paddingBottom: "96px",
          borderTop: "1px solid var(--border)",
        }}
      >
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <h2
              className="text-3xl font-bold"
              style={{ color: "var(--foreground)", fontFamily: "'A2Z', sans-serif", letterSpacing: "-0.01em" }}
            >
              Simple, transparent pricing
            </h2>
            <p className="mt-2 text-base" style={{ color: "var(--muted-foreground)" }}>
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
          backgroundColor: "var(--background)",
          paddingTop: "64px",
          paddingBottom: "128px",
          borderTop: "1px solid var(--border)",
        }}
      >
        <div className="mx-auto max-w-2xl text-center">
          <h2
            className="text-3xl font-bold"
            style={{ color: "var(--foreground)", fontFamily: "'A2Z', sans-serif", letterSpacing: "-0.01em" }}
          >
            Ready to build your operations manual?
          </h2>
          <p
            className="mt-3 leading-relaxed"
            style={{ color: "var(--muted-foreground)", fontSize: "16px" }}
          >
            Create your first AI-generated manual in under a minute.
            No credit card required.
          </p>
          <div className="mt-8">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-md px-6 py-3 text-sm font-semibold transition-colors duration-150"
              style={{ backgroundColor: "#4F8BFF", color: "#FFFFFF", fontFamily: "'A2Z', sans-serif" }}
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
