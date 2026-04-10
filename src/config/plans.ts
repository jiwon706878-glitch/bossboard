export type PlanId = "free" | "starter" | "pro" | "business";

export interface PlanConfig {
  id: PlanId;
  name: string;
  description: string;
  monthlyPrice: number;
  annualPrice: number;
  paddlePriceIdMonthly: string;
  paddlePriceIdAnnual: string;
  limits: {
    aiCredits: number; // per month, -1 = unlimited
    sops: number; // -1 = unlimited
    teamMembers: number; // -1 = unlimited
    storageGb: number; // total storage in GB
    fileSizeMb: number; // per-file upload limit in MB
    egressGbPerMonth: number; // monthly download bandwidth in GB
  };
  features: string[];
}

export const plans: Record<PlanId, PlanConfig> = {
  free: {
    id: "free",
    name: "Free",
    description: "Get started with BYOK",
    monthlyPrice: 0,
    annualPrice: 0,
    paddlePriceIdMonthly: "",
    paddlePriceIdAnnual: "",
    limits: {
      aiCredits: 30,
      sops: 20,
      teamMembers: 3,
      storageGb: 5,
      fileSizeMb: 50,
      egressGbPerMonth: 10,
    },
    features: [
      "3 team members",
      "30 AI credits/month (+10 signup bonus)",
      "5 GB storage · 50 MB per file",
      "10 GB monthly downloads",
      "MCP + CLI + REST API",
      "BYOK (use your own key)",
      "Wiki version history",
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
      storageGb: 50,
      fileSizeMb: 100,
      egressGbPerMonth: 100,
    },
    features: [
      "Unlimited team members",
      "500 AI credits/month",
      "50 GB storage · 100 MB per file",
      "100 GB monthly downloads",
      "Everything in Free",
      "Daily / weekly / monthly recurring checklists",
      "Priority MCP + CLI support",
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
      storageGb: 200,
      fileSizeMb: 500,
      egressGbPerMonth: 500,
    },
    features: [
      "Unlimited team members",
      "1,500 AI credits/month",
      "200 GB storage · 500 MB per file",
      "500 GB monthly downloads",
      "Everything in Starter",
      "Read tracking & sign-off",
      "Agent activity dashboard with charts",
      "Folder access control (basic)",
      "Priority support",
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
      storageGb: 1000,
      fileSizeMb: 1024,
      egressGbPerMonth: 2000,
    },
    features: [
      "Unlimited team members",
      "5,000 AI credits/month",
      "1 TB storage · 1 GB per file",
      "2 TB monthly downloads",
      "Everything in Pro",
      "Folder access control (advanced, per-role + API key scopes)",
      "Onboarding paths with progress tracking",
      "Dedicated support",
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
