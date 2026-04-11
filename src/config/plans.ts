export type PlanId = "free" | "starter" | "pro" | "business";

/**
 * Plan limits. The landing copy no longer surfaces `aiCredits` as a
 * user-visible number (BB v2.0 positions BYOK-first), but the field
 * stays here because /api/ai/chat, /api/ai/generate, the coupon
 * system, and the admin dashboards all read it. A Day 4+ refactor
 * can fully remove credits; Day 3 just hides them from marketing.
 */
export interface PlanConfig {
  id: PlanId;
  name: string;
  description: string;
  monthlyPrice: number;
  annualPrice: number;
  paddlePriceIdMonthly: string;
  paddlePriceIdAnnual: string;
  limits: {
    aiCredits: number;            // per month, -1 = unlimited (internal only)
    sops: number;                 // -1 = unlimited
    teamMembers: number;          // -1 = unlimited humans
    agentMembers: number;         // -1 = unlimited agents; BB v2.0 cap
    storageGb: number;            // total storage in GB
    fileSizeMb: number;           // per-file upload limit in MB
    egressGbPerMonth: number;     // monthly download bandwidth in GB
    autoIndexing: boolean;        // Gemini auto-index on save
    aiChat: boolean;              // in-app AI chat with workspace
  };
  features: string[];
}

export const plans: Record<PlanId, PlanConfig> = {
  free: {
    id: "free",
    name: "Free",
    description: "Get started with your AI agents",
    monthlyPrice: 0,
    annualPrice: 0,
    paddlePriceIdMonthly: "",
    paddlePriceIdAnnual: "",
    limits: {
      aiCredits: 30,
      sops: 20,
      teamMembers: 3,
      agentMembers: 3,
      storageGb: 5,
      fileSizeMb: 50,
      egressGbPerMonth: 10,
      autoIndexing: false,
      aiChat: false,
    },
    features: [
      "3 team members + 3 AI agents",
      "5 GB storage · 50 MB per file",
      "10 GB monthly downloads",
      "Wiki, Board, Calendar, Todos",
      "MCP server + REST API",
      "BYOK (use your own AI key)",
      "Basic search (full-text)",
    ],
  },
  starter: {
    id: "starter",
    name: "Starter",
    description: "For solo agent builders",
    monthlyPrice: 19,
    annualPrice: 190,
    paddlePriceIdMonthly: process.env.PADDLE_STARTER_MONTHLY_PRICE_ID || "",
    paddlePriceIdAnnual: process.env.PADDLE_STARTER_ANNUAL_PRICE_ID || "",
    limits: {
      aiCredits: 500,
      sops: -1,
      teamMembers: -1,
      agentMembers: 10,
      storageGb: 50,
      fileSizeMb: 200,
      egressGbPerMonth: 100,
      autoIndexing: true,
      aiChat: true,
    },
    features: [
      "Unlimited team members",
      "Up to 10 AI agents",
      "50 GB storage · 200 MB per file",
      "100 GB monthly downloads",
      "Everything in Free",
      "Smart search (AI-indexed)",
      "AI Chat with workspace",
      "Daily / weekly / monthly checklists",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    description: "For agent teams",
    monthlyPrice: 49,
    annualPrice: 490,
    paddlePriceIdMonthly: process.env.PADDLE_PRO_MONTHLY_PRICE_ID || "",
    paddlePriceIdAnnual: process.env.PADDLE_PRO_ANNUAL_PRICE_ID || "",
    limits: {
      aiCredits: 1500,
      sops: -1,
      teamMembers: -1,
      agentMembers: 50,
      storageGb: 200,
      fileSizeMb: 2000,
      egressGbPerMonth: 500,
      autoIndexing: true,
      aiChat: true,
    },
    features: [
      "Unlimited team members",
      "Up to 50 AI agents",
      "200 GB storage · 2 GB per file",
      "500 GB monthly downloads",
      "Everything in Starter",
      "Read tracking & sign-off",
      "Agent activity dashboard",
      "Folder access control (basic)",
    ],
  },
  business: {
    id: "business",
    name: "Business",
    description: "For agencies & enterprises",
    monthlyPrice: 129,
    annualPrice: 1290,
    paddlePriceIdMonthly: process.env.PADDLE_BUSINESS_MONTHLY_PRICE_ID || "",
    paddlePriceIdAnnual: process.env.PADDLE_BUSINESS_ANNUAL_PRICE_ID || "",
    limits: {
      aiCredits: 5000,
      sops: -1,
      teamMembers: -1,
      agentMembers: -1,
      storageGb: 1024,
      fileSizeMb: 10240,
      egressGbPerMonth: 2048,
      autoIndexing: true,
      aiChat: true,
    },
    features: [
      "Unlimited team members",
      "Unlimited AI agents",
      "1 TB storage · 10 GB per file",
      "2 TB monthly downloads",
      "Everything in Pro",
      "Folder access control (advanced)",
      "Onboarding paths with progress tracking",
      "Priority email support",
    ],
  },
};

export function getPlanById(planId: PlanId): PlanConfig {
  return plans[planId];
}

export function getPlanByPaddlePriceId(
  priceId: string
): PlanConfig | undefined {
  return Object.values(plans).find(
    (plan) =>
      plan.paddlePriceIdMonthly === priceId ||
      plan.paddlePriceIdAnnual === priceId
  );
}
