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
} from "lucide-react";
import { MOTION } from "@/lib/motion/tokens";

const ONBOARDING_KEY = "bb_onboarding_complete";

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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="flex gap-1 mb-8 w-full max-w-md">
        {[0, 1, 2].map((s) => (
          <div
            key={s}
            className={`h-1 flex-1 rounded-full ${
              s <= step ? "bg-bb-primary" : "bg-bb-border"
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
          className="max-w-md w-full text-center"
        >
          {step === 0 && (
            <>
              <div className="size-16 rounded-2xl bg-bb-primary/10 grid place-items-center mx-auto mb-6">
                <Sparkles className="w-8 h-8 text-bb-primary" />
              </div>
              <h1 className="text-3xl font-bold mb-3">Welcome to BossBoard</h1>
              <p className="text-gray-400 mb-8">
                Your local-first AI workspace. Files stay on your machine, agents do
                real work, and you bring your own AI keys.
              </p>
              <div className="grid grid-cols-3 gap-3 mb-8 text-left">
                <Feature icon={<FolderOpen className="w-5 h-5" />} title="Local files" />
                <Feature icon={<Bot className="w-5 h-5" />} title="AI agents" />
                <Feature icon={<KeyRound className="w-5 h-5" />} title="Your keys" />
              </div>
              <button
                onClick={() => setStep(1)}
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
                  onClick={() => setStep(0)}
                  className="px-3 py-2 text-sm border border-bb-border hover:bg-bb-card rounded-md inline-flex items-center gap-1"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 px-3 py-2 text-sm bg-bb-primary hover:bg-bb-primary-hover rounded-md inline-flex items-center justify-center gap-1"
                >
                  Continue <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </>
          )}

          {step === 2 && (
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
