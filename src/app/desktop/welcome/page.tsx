"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  SkipForward,
  FolderOpen,
  Bot,
  KeyRound,
  Check,
  Info,
} from "lucide-react";
import { MOTION } from "@/lib/motion/tokens";
import { TourIllustration } from "@/components/desktop/tour-illustration";

const ONBOARDING_KEY = "bb_onboarding_complete";
const TOTAL_STEPS = 6;

export default function WelcomePage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");

  // If they've already finished onboarding, send them to the dashboard.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(ONBOARDING_KEY) === "true") {
      router.replace("/desktop/dashboard");
    }
  }, [router]);

  function complete(redirect: string) {
    if (name.trim()) {
      localStorage.setItem("bb_user_display_name", name.trim());
    }
    localStorage.setItem(ONBOARDING_KEY, "true");
    router.replace(redirect);
  }

  function next() {
    setStep((s) => Math.min(TOTAL_STEPS - 1, s + 1));
  }
  function prev() {
    setStep((s) => Math.max(0, s - 1));
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="flex gap-1 mb-8 w-full max-w-md">
        {Array.from({ length: TOTAL_STEPS }, (_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full ${
              i <= step ? "bg-bb-primary" : "bg-bb-border"
            }`}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: MOTION.duration.base, ease: MOTION.ease.out }}
          className={
            step >= 2 && step <= 4
              ? "max-w-xl w-full"
              : "max-w-md w-full text-center"
          }
        >
          {step === 0 && (
            <>
              <div className="size-16 rounded-2xl bg-bb-primary/10 grid place-items-center mx-auto mb-6">
                <Sparkles className="w-8 h-8 text-bb-primary" />
              </div>
              <h1 className="text-3xl font-bold mb-3">Welcome to BossBoard</h1>
              <p className="text-gray-400 mb-6">
                Your local-first AI workspace. Files stay on your machine, agents do
                real work, and you bring your own AI keys.
              </p>

              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mb-6 text-left">
                <div className="flex items-start gap-2">
                  <Info className="size-4 text-amber-400 mt-0.5 shrink-0" />
                  <div className="text-sm text-amber-200">
                    <div className="font-semibold">This is Beta v0.1</div>
                    <ul className="mt-1.5 space-y-0.5 text-amber-200/80 text-xs">
                      <li>• Built by one person — please be patient with bugs</li>
                      <li>• Auto-backup runs daily, kept 7 days</li>
                      <li>
                        • Found a bug?{" "}
                        <a
                          href="mailto:jay@mybossboard.com?subject=BossBoard%20bug"
                          className="underline hover:text-amber-100"
                        >
                          Tell me
                        </a>{" "}
                        — I respond within 24h
                      </li>
                      <li>• First 100 paying users get 30 % off forever</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-8 text-left">
                <Feature icon={<FolderOpen className="w-5 h-5" />} title="Local files" />
                <Feature icon={<Bot className="w-5 h-5" />} title="AI agents" />
                <Feature icon={<KeyRound className="w-5 h-5" />} title="Your keys" />
              </div>
              <button
                onClick={next}
                className="w-full px-4 py-2 bg-bb-primary hover:bg-bb-primary-hover rounded-md text-sm inline-flex items-center justify-center gap-1"
              >
                Let&apos;s get started <ArrowRight className="w-4 h-4" />
              </button>
              <p className="text-[11px] text-gray-500 mt-4">
                Beta v0.1 · this only takes a minute
              </p>
            </>
          )}

          {step === 1 && (
            <>
              <h1 className="text-2xl font-bold mb-3">What should we call you?</h1>
              <p className="text-gray-400 mb-6">
                Optional — your agents use this when they greet you.
              </p>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="w-full p-3 bg-bb-card border border-bb-border rounded-md text-sm mb-6"
              />
              <div className="flex gap-2">
                <button
                  onClick={prev}
                  className="px-3 py-2 text-sm border border-bb-border hover:bg-bb-card rounded-md inline-flex items-center gap-1"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button
                  onClick={next}
                  className="flex-1 px-3 py-2 text-sm bg-bb-primary hover:bg-bb-primary-hover rounded-md inline-flex items-center justify-center gap-1"
                >
                  Continue <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </>
          )}

          {step === 2 && (
            <TourStep
              kicker="Step 1 of 3 · Tour"
              title="Your Library"
              description="Markdown files. Local. Editable in any editor — Obsidian, VS Code, Notepad. Drop notes, reference docs, project context."
              slide="library"
              bullets={[
                "Frontmatter tags help you and your agents search.",
                "Agents read + write to your library via tools.",
                "Open the same folder in Obsidian — full round-trip.",
              ]}
              onPrev={prev}
              onNext={next}
              nextLabel="Next: Agents"
            />
          )}

          {step === 3 && (
            <TourStep
              kicker="Step 2 of 3 · Tour"
              title="AI Agents with Manuals"
              description="Each agent has manual.md (role + behaviour) and memory.md (long-term memory). Edit them like documents."
              slide="agents"
              bullets={[
                "Pick a template (Personal Assistant, Specialist, Reviewer) or start blank.",
                "Conversations persist as files — agents recall context across sessions.",
                "Memory compresses automatically when threads get long.",
              ]}
              onPrev={prev}
              onNext={next}
              nextLabel="Next: BYOK"
            />
          )}

          {step === 4 && (
            <TourStep
              kicker="Step 3 of 3 · Tour"
              title="Bring Your Own Key"
              description="Use any AI provider. Your usage goes to them directly. BossBoard never marks up AI costs."
              slide="byok"
              bullets={[
                "Anthropic, Google, OpenAI, xAI Grok — all supported.",
                "Local LLMs (Ollama, LM Studio) work fully offline.",
                "Multiple keys per provider; pin a specific key per agent.",
              ]}
              onPrev={prev}
              onNext={next}
              nextLabel="Set up your first agent"
            />
          )}

          {step === 5 && (
            <>
              <div className="size-16 rounded-2xl bg-bb-primary/10 grid place-items-center mx-auto mb-6">
                <Bot className="w-8 h-8 text-bb-primary" />
              </div>
              <h1 className="text-2xl font-bold mb-3">Create your first agent</h1>
              <p className="text-gray-400 mb-6">
                A Personal Assistant is a great starting point — it learns your
                preferences over time. Or skip and explore on your own.
              </p>
              <div className="space-y-2">
                <Link
                  href="/desktop/agents/new"
                  onClick={() => {
                    if (name.trim())
                      localStorage.setItem("bb_user_display_name", name.trim());
                    localStorage.setItem(ONBOARDING_KEY, "true");
                  }}
                  className="block w-full px-4 py-2 bg-bb-primary hover:bg-bb-primary-hover rounded-md text-sm inline-flex items-center justify-center gap-1"
                >
                  <Check className="w-4 h-4" /> Create my first agent
                </Link>
                <button
                  onClick={() => complete("/desktop/dashboard")}
                  className="w-full px-4 py-2 hover:bg-bb-card rounded-md text-sm text-gray-400 inline-flex items-center justify-center gap-1"
                >
                  <SkipForward className="w-4 h-4" /> Skip — I&apos;ll explore on my own
                </button>
              </div>
              <p className="text-[11px] text-gray-500 mt-4">
                You can always create more agents later
              </p>
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function Feature({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="bg-bb-card rounded-md p-3 text-center">
      <div className="size-9 rounded-md bg-bb-primary/10 grid place-items-center mx-auto mb-2 text-bb-primary">
        {icon}
      </div>
      <div className="text-xs">{title}</div>
    </div>
  );
}

function TourStep({
  title,
  kicker,
  description,
  slide,
  bullets,
  onPrev,
  onNext,
  nextLabel,
}: {
  title: string;
  kicker: string;
  description: string;
  slide: "library" | "agents" | "byok";
  bullets: string[];
  onPrev: () => void;
  onNext: () => void;
  nextLabel: string;
}) {
  return (
    <>
      <div className="text-xs uppercase tracking-wide text-bb-primary mb-1">
        {kicker}
      </div>
      <h2 className="text-2xl font-bold mb-2">{title}</h2>
      <p className="text-gray-400 mb-5">{description}</p>

      <div className="rounded-lg border border-bb-border overflow-hidden mb-5 bg-bb-card">
        <TourIllustration slide={slide} />
      </div>

      <ul className="text-sm space-y-2 mb-6">
        {bullets.map((b) => (
          <li key={b} className="flex items-start gap-2">
            <Check className="size-4 text-green-400 mt-0.5 shrink-0" />
            <span>{b}</span>
          </li>
        ))}
      </ul>

      <div className="flex gap-2">
        <button
          onClick={onPrev}
          className="px-3 py-2 text-sm border border-bb-border hover:bg-bb-card rounded-md inline-flex items-center gap-1"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <button
          onClick={onNext}
          className="flex-1 px-3 py-2 text-sm bg-bb-primary hover:bg-bb-primary-hover rounded-md inline-flex items-center justify-center gap-1"
        >
          {nextLabel} <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </>
  );
}
