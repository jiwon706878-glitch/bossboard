"use client";

import { motion } from "framer-motion";

const ROWS = [
  { label: "Data location", bb: "Your machine", chatgpt: "OpenAI servers" },
  { label: "AI provider", bb: "Any (BYOK)", chatgpt: "OpenAI only" },
  { label: "Agent memory", bb: "Persistent files", chatgpt: "Session memory" },
  { label: "Offline mode", bb: "Yes (local LLM)", chatgpt: "No" },
  { label: "External tools", bb: "MCP-native", chatgpt: "Limited" },
  { label: "Data for training", bb: "Never", chatgpt: "Opt-out" },
];

export function V3VsChatGPT() {
  return (
    <section className="py-20 px-6 bg-muted/30">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl font-bold mb-3">
            BossBoard vs ChatGPT Workspace
          </h2>
          <p className="text-muted-foreground">
            Both let agents collaborate. Only one keeps your data on your
            machine.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="rounded-2xl border overflow-hidden bg-background"
        >
          <div className="grid grid-cols-3 bg-muted/50 px-6 py-4 font-semibold text-sm">
            <div></div>
            <div className="text-center text-primary">BossBoard</div>
            <div className="text-center text-muted-foreground">
              ChatGPT Workspace
            </div>
          </div>
          {ROWS.map((row) => (
            <div
              key={row.label}
              className="grid grid-cols-3 px-6 py-4 border-t text-sm"
            >
              <div className="font-medium">{row.label}</div>
              <div className="text-center">✅ {row.bb}</div>
              <div className="text-center text-muted-foreground">
                {row.chatgpt}
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
