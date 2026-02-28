export type PlanId = "free" | "starter" | "pro" | "agency";

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
    businesses: number;
    socialPosts: number; // per month, -1 = unlimited
    teamMembers: number;
  };
  features: string[];
}

export const plans: Record<PlanId, PlanConfig> = {
  free: {
    id: "free",
    name: "Free",
    description: "Try it out",
    monthlyPrice: 0,
    annualPrice: 0,
    paddlePriceIdMonthly: "",
    paddlePriceIdAnnual: "",
    limits: {
      aiCredits: 25,
      businesses: 1,
      socialPosts: 10,
      teamMembers: 1,
    },
    features: [
      "25 AI credits/month",
      "1 business profile",
      "Review reply generation",
      "Basic social captions",
      "10 scheduled posts/month",
    ],
  },
  starter: {
    id: "starter",
    name: "Starter",
    description: "For solo operators",
    monthlyPrice: 29,
    annualPrice: 290,
    paddlePriceIdMonthly: process.env.PADDLE_STARTER_MONTHLY_PRICE_ID || "",
    paddlePriceIdAnnual: process.env.PADDLE_STARTER_ANNUAL_PRICE_ID || "",
    limits: {
      aiCredits: 200,
      businesses: 1,
      socialPosts: 50,
      teamMembers: 1,
    },
    features: [
      "200 AI credits/month",
      "1 business profile",
      "All AI features",
      "50 scheduled posts/month",
      "Content Studio scripts",
      "Priority support",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    description: "For growing businesses",
    monthlyPrice: 79,
    annualPrice: 790,
    paddlePriceIdMonthly: process.env.PADDLE_PRO_MONTHLY_PRICE_ID || "",
    paddlePriceIdAnnual: process.env.PADDLE_PRO_ANNUAL_PRICE_ID || "",
    limits: {
      aiCredits: -1,
      businesses: 3,
      socialPosts: -1,
      teamMembers: 3,
    },
    features: [
      "Unlimited AI credits",
      "3 business profiles",
      "All AI features",
      "Unlimited scheduled posts",
      "Content Studio scripts",
      "Priority support",
      "Analytics dashboard",
    ],
  },
  agency: {
    id: "agency",
    name: "Agency",
    description: "For agencies & multi-location",
    monthlyPrice: 199,
    annualPrice: 1990,
    paddlePriceIdMonthly: process.env.PADDLE_AGENCY_MONTHLY_PRICE_ID || "",
    paddlePriceIdAnnual: process.env.PADDLE_AGENCY_ANNUAL_PRICE_ID || "",
    limits: {
      aiCredits: -1,
      businesses: 25,
      socialPosts: -1,
      teamMembers: 10,
    },
    features: [
      "Unlimited AI credits",
      "25 business profiles",
      "All AI features",
      "Unlimited scheduled posts",
      "Content Studio scripts",
      "Dedicated support",
      "Analytics dashboard",
      "White-label options",
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
