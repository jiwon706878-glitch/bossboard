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
  };
  features: string[];
}

export const plans: Record<PlanId, PlanConfig> = {
  free: {
    id: "free",
    name: "Free",
    description: "Get started",
    monthlyPrice: 0,
    annualPrice: 0,
    paddlePriceIdMonthly: "",
    paddlePriceIdAnnual: "",
    limits: {
      aiCredits: 5,
      sops: 20,
      teamMembers: 3,
    },
    features: [
      "20 documents",
      "3 team members",
      "5 AI generations/month",
      "Basic folders & search",
      "2 GB storage",
    ],
  },
  starter: {
    id: "starter",
    name: "Starter",
    description: "For small teams",
    monthlyPrice: 19,
    annualPrice: 190,
    paddlePriceIdMonthly: process.env.PADDLE_STARTER_MONTHLY_PRICE_ID || "",
    paddlePriceIdAnnual: process.env.PADDLE_STARTER_ANNUAL_PRICE_ID || "",
    limits: {
      aiCredits: 200,
      sops: -1,
      teamMembers: 15,
    },
    features: [
      "Unlimited documents",
      "15 team members",
      "200 AI generations/month",
      "All folders & tags",
      "Daily checklists",
      "File upload & AI reformat",
      "API & MCP access",
      "10 GB storage",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    description: "For growing operations",
    monthlyPrice: 49,
    annualPrice: 490,
    paddlePriceIdMonthly: process.env.PADDLE_PRO_MONTHLY_PRICE_ID || "",
    paddlePriceIdAnnual: process.env.PADDLE_PRO_ANNUAL_PRICE_ID || "",
    limits: {
      aiCredits: -1,
      sops: -1,
      teamMembers: 30,
    },
    features: [
      "Everything in Starter",
      "30 team members",
      "Unlimited AI generations",
      "Version history",
      "Read tracking & sign-off",
      "Recurring checklists",
      "Completion dashboard",
      "Notifications & alerts",
      "Advanced sharing controls",
      "Agent activity dashboard",
      "Priority support",
      "50 GB storage",
    ],
  },
  business: {
    id: "business",
    name: "Business",
    description: "For enterprises",
    monthlyPrice: 129,
    annualPrice: 1290,
    paddlePriceIdMonthly: process.env.PADDLE_BUSINESS_MONTHLY_PRICE_ID || "",
    paddlePriceIdAnnual: process.env.PADDLE_BUSINESS_ANNUAL_PRICE_ID || "",
    limits: {
      aiCredits: -1,
      sops: -1,
      teamMembers: -1,
    },
    features: [
      "Everything in Pro",
      "Unlimited team members",
      "Folder access control",
      "Onboarding paths",
      "Real-time collaboration (coming soon)",
      "Dedicated support",
      "Custom integrations",
      "200 GB storage",
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
