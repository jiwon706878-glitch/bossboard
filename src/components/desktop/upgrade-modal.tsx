"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Lock, X, Check } from "lucide-react";
import type { Feature } from "@/lib/plan-gate";
import type { PlanId } from "@/config/plans";

const FEATURE_DESCRIPTIONS: Record<
  Feature,
  { title: string; description: string }
> = {
  dm_cloud_sync: {
    title: "DM Cloud Sync",
    description:
      "Sync your direct messages across multiple devices. DMs stay encrypted at rest and in transit.",
  },
  ai_meeting_room_full: {
    title: "Full AI Meeting Room",
    description:
      "Unlock free-discussion mode where agents interrupt each other naturally instead of strict round-robin.",
  },
  smart_search: {
    title: "Smart Search",
    description:
      "Semantic search powered by embeddings — find files by meaning, not just keywords.",
  },
  team_workspace: {
    title: "Team Workspace",
    description:
      "Share your workspace with teammates. Role-based permissions across Library, agents, and meetings.",
  },
  more_than_3_agents: {
    title: "More than 3 agents",
    description:
      "Build a larger team of specialised AI agents (up to 10 on Starter).",
  },
  more_than_10_agents: {
    title: "More than 10 agents",
    description: "Scale to a power-user roster of up to 50 agents.",
  },
  more_than_50_agents: {
    title: "Unlimited agents",
    description: "Build a Business-scale agent team with no per-seat limit.",
  },
  email_integration: {
    title: "Email Integration",
    description:
      "Connect Gmail / Outlook / IMAP so agents can read, search, and draft replies. Sending requires explicit approval.",
  },
  mcp_client: {
    title: "MCP Client",
    description:
      "Let your agents call external tools via the Model Context Protocol — GitHub, Notion, Linear, and more.",
  },
  library_cloud_sync: {
    title: "Library Cloud Sync",
    description:
      "Sync your Library across devices. Coming in v3.2 — Pro+ subscribers get early access on launch.",
  },
  priority_feature_requests: {
    title: "Priority Feature Requests",
    description:
      "Submit feature requests prioritized for the next release cycle. Direct line to the BB roadmap.",
  },
};

const PLAN_PRICING: Record<
  PlanId,
  { price: string; betaPrice: string | null }
> = {
  free: { price: "$0", betaPrice: null },
  starter: { price: "$19.80/mo", betaPrice: "$13.86/mo" },
  pro: { price: "$49.50/mo", betaPrice: "$34.65/mo" },
  business: { price: "$129.90/mo", betaPrice: "$90.93/mo" },
};

interface Props {
  feature: Feature;
  requiredPlan: PlanId;
  onClose: () => void;
  onUpgrade: () => void;
}

export function UpgradeModal({
  feature,
  requiredPlan,
  onClose,
  onUpgrade,
}: Props) {
  const featureInfo = FEATURE_DESCRIPTIONS[feature];
  const pricing = PLAN_PRICING[requiredPlan];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 8 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 8 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="bg-bb-card border border-bb-border rounded-2xl shadow-2xl max-w-md w-full p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between mb-4">
            <div className="size-12 rounded-full bg-bb-primary/15 grid place-items-center">
              <Lock className="size-6 text-bb-primary" />
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-bb-fg"
              aria-label="Close"
            >
              <X className="size-4" />
            </button>
          </div>

          <h2 className="text-xl font-semibold mb-1">{featureInfo.title}</h2>
          <p className="text-sm text-gray-400 mb-5">{featureInfo.description}</p>

          <div className="rounded-lg border border-bb-border p-4 mb-5 bg-bb-primary/5">
            <div className="flex items-baseline justify-between mb-3">
              <h3 className="font-semibold capitalize">
                {requiredPlan} plan
              </h3>
              <div className="text-right">
                <div className="text-lg font-bold">{pricing.price}</div>
                {pricing.betaPrice && (
                  <div className="text-xs text-amber-400 font-medium">
                    {pricing.betaPrice} (first 100 users)
                  </div>
                )}
              </div>
            </div>
            <ul className="text-sm space-y-1.5">
              <li className="flex items-center gap-2">
                <Check className="size-4 text-green-400 shrink-0" />
                <span>{featureInfo.title}</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="size-4 text-green-400 shrink-0" />
                <span>All Free features</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="size-4 text-green-400 shrink-0" />
                <span>Priority support</span>
              </li>
            </ul>
          </div>

          <div className="space-y-2">
            <button
              onClick={onUpgrade}
              className="w-full px-4 py-2 bg-bb-primary hover:bg-bb-primary-hover rounded-md text-sm font-medium"
            >
              Upgrade to {requiredPlan}
            </button>
            <button
              onClick={onClose}
              className="w-full px-4 py-2 hover:bg-bb-bg rounded-md text-sm text-gray-400"
            >
              Maybe later
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
