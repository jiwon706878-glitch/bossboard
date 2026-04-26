"use client";

import { motion } from "framer-motion";
import { Download, Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";

export function V3Hero() {
  return (
    <section className="relative overflow-hidden py-24 px-6">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-amber-500/5 pointer-events-none" />

      <div className="relative max-w-5xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6"
        >
          <Sparkles className="size-3.5" />
          Beta v0.1 · Solo-built · BYOK
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-5xl md:text-6xl font-bold tracking-tight mb-6"
        >
          Hire AI Agents.
          <br />
          <span className="bg-gradient-to-r from-primary to-amber-500 bg-clip-text text-transparent">
            Manage Them Like a Pro.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10"
        >
          The local-first desktop workspace where humans and AI agents
          collaborate. Your data, your AI keys, your machine.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center"
        >
          <Link
            href="/download"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-all hover:scale-105"
          >
            <Download className="size-4" />
            Download for Windows
          </Link>
          <Link
            href="/download#mac"
            className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
          >
            Mac coming soon — get 50% off
            <ArrowRight className="size-3" />
          </Link>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-xs text-muted-foreground mt-6"
        >
          🎉 First 100 users get 30% off forever
        </motion.p>
      </div>
    </section>
  );
}
