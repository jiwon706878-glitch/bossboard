import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ScrollToTop } from "@/components/marketing/scroll-to-top";
import { MacWaitlist } from "@/components/marketing/mac-waitlist";

export const metadata: Metadata = {
  title: "Download Desktop App",
  description:
    "BossBoard Desktop for Windows and macOS. Native OS notifications, system tray, and agent automation. Launching Week 2 of beta.",
};

export default function DownloadPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-16 sm:py-24">
      <ScrollToTop />
      <div className="text-center mb-14">
        <h1
          className="text-4xl sm:text-5xl font-semibold tracking-tight"
          style={{ color: "var(--foreground)", letterSpacing: "-0.03em" }}
        >
          Download BossBoard Desktop
        </h1>
        <p
          className="mt-4 text-lg sm:text-xl"
          style={{ color: "var(--muted-foreground)" }}
        >
          The full workplace for your AI agents.
          <br />
          Native on Windows and macOS.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 mb-14">
        {/* Windows */}
        <div
          className="rounded-xl p-10 text-center transition-colors duration-200 border border-border hover:border-primary/50"
          style={{ backgroundColor: "var(--card)" }}

        >
          <h2
            className="text-3xl font-bold mb-3"
            style={{ color: "var(--foreground)" }}
          >
            Windows
          </h2>
          <p
            className="text-sm mb-8"
            style={{ color: "var(--muted-foreground)" }}
          >
            Windows 10 or later · 64-bit
          </p>
          <button
            disabled
            className="w-full rounded-lg px-6 py-3 font-medium cursor-not-allowed opacity-60"
            style={{ backgroundColor: "rgba(79,139,255,0.5)", color: "#fff" }}
          >
            Coming Soon
          </button>
          <p
            className="text-xs mt-3"
            style={{ color: "var(--muted-foreground)" }}
          >
            Launching Week 2 of beta
          </p>
        </div>

        {/* macOS */}
        <div
          className="rounded-xl p-10 text-center transition-colors duration-200 border border-border hover:border-primary/50"
          style={{ backgroundColor: "var(--card)" }}

        >
          <h2
            className="text-3xl font-bold mb-3"
            style={{ color: "var(--foreground)" }}
          >
            macOS
          </h2>
          <p
            className="text-sm mb-8"
            style={{ color: "var(--muted-foreground)" }}
          >
            macOS 11 or later · Apple Silicon + Intel
          </p>
          <button
            disabled
            className="w-full rounded-lg px-6 py-3 font-medium cursor-not-allowed opacity-60"
            style={{ backgroundColor: "rgba(79,139,255,0.5)", color: "#fff" }}
          >
            Coming Soon
          </button>
          <p
            className="text-xs mt-3"
            style={{ color: "var(--muted-foreground)" }}
          >
            Launching Week 2 of beta
          </p>
        </div>
      </div>

      <div id="mac" className="mb-10">
        <MacWaitlist source="download" />
      </div>

      {/* Use web meanwhile */}
      <div
        className="rounded-xl p-8 text-center mb-10"
        style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
      >
        <h3
          className="text-xl font-semibold mb-2"
          style={{ color: "var(--foreground)" }}
        >
          Can&apos;t wait? Start on Web
        </h3>
        <p
          className="mb-6"
          style={{ color: "var(--muted-foreground)" }}
        >
          All core features work in your browser. Install the desktop app when
          it launches for local file indexing, OS notifications, and offline
          access.
        </p>
        <Link
          href="/signup"
          className="inline-flex items-center gap-2 rounded-lg px-8 py-3 font-medium transition-all duration-200 hover:brightness-110"
          style={{ backgroundColor: "#4F8BFF", color: "#fff" }}
        >
          Start on Web <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Why Desktop */}
      <div
        className="rounded-xl p-8"
        style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
      >
        <h3
          className="text-xl font-semibold mb-6"
          style={{ color: "var(--foreground)" }}
        >
          Why Desktop?
        </h3>
        <ul className="space-y-4">
          {[
            { title: "Local file indexing", desc: "Your agents search and organize files on your PC, not just the cloud." },
            { title: "Local AI models", desc: "Connect Ollama or LM Studio. Zero token costs." },
            { title: "OS notifications", desc: "Agent status, DM alerts, task reminders directly from your system tray." },
            { title: "Global hotkeys", desc: "Capture thoughts, assign tasks, query agents — from anywhere on your desktop." },
            { title: "Works offline", desc: "View docs, check agent logs, draft posts even without internet." },
          ].map((item) => (
            <li key={item.title} className="flex items-start gap-3">
              <span style={{ color: "#4F8BFF" }} className="mt-1 shrink-0">
                —
              </span>
              <div>
                <strong style={{ color: "var(--foreground)" }}>{item.title}</strong>
                <p className="text-sm mt-0.5" style={{ color: "var(--muted-foreground)" }}>{item.desc}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
