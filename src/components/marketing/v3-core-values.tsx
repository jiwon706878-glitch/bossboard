"use client";

import { motion } from "framer-motion";
import { Lock, Plug, Users } from "lucide-react";

const VALUES = [
  {
    icon: Lock,
    title: "Local-first",
    description:
      "Your library, DMs, and agent memory live on your machine. Nothing on BB servers — period.",
  },
  {
    icon: Plug,
    title: "BYOK (Bring Your Own Key)",
    description:
      "Use any AI: Claude, GPT, Gemini, Grok, or local models (Ollama). No markup. No lock-in.",
  },
  {
    icon: Users,
    title: "Real Persistent Agents",
    description:
      "Manuals + memory + DMs that survive sessions. Agents learn your workflow over time.",
  },
];

export function V3CoreValues() {
  return (
    <section className="py-20 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {VALUES.map((v, i) => {
            const Icon = v.icon;
            return (
              <motion.div
                key={v.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4 text-primary">
                  <Icon className="size-6" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{v.title}</h3>
                <p className="text-sm text-muted-foreground">{v.description}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
