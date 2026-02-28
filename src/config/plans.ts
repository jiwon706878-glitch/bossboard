export type PlanId = "free" | "pro" | "business" | "enterprise";

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
      aiCredits: 30,
      businesses: 1,
      socialPosts: 15,
      teamMembers: 1,
    },
    features: [
      "30 AI credits/month",
      "1 business profile",
      "Review reply generation",
      "AI social captions",
      "15 scheduled posts/month",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    description: "For solo operators",
    monthlyPrice: 19.99,
    annualPrice: 199.99,
    paddlePriceIdMonthly: process.env.PADDLE_PRO_MONTHLY_PRICE_ID || "",
    paddlePriceIdAnnual: process.env.PADDLE_PRO_ANNUAL_PRICE_ID || "",
    limits: {
      aiCredits: 1000,
      businesses: 1,
      socialPosts: 50,
      teamMembers: 1,
    },
    features: [
      "1,000 AI credits/month",
      "1 business profile",
      "All AI features",
      "50 scheduled posts/month",
      "Content Studio scripts",
      "Priority support",
    ],
  },
  business: {
    id: "business",
    name: "Business",
    description: "For growing businesses",
    monthlyPrice: 39.99,
    annualPrice: 399.99,
    paddlePriceIdMonthly: process.env.PADDLE_BUSINESS_MONTHLY_PRICE_ID || "",
    paddlePriceIdAnnual: process.env.PADDLE_BUSINESS_ANNUAL_PRICE_ID || "",
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
      "Team collaboration (3 users)",
      "Custom brand voice",
      "Priority support",
      "Analytics dashboard",
    ],
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    description: "For agencies & multi-location",
    monthlyPrice: 79.99,
    annualPrice: 799.99,
    paddlePriceIdMonthly: process.env.PADDLE_ENTERPRISE_MONTHLY_PRICE_ID || "",
    paddlePriceIdAnnual: process.env.PADDLE_ENTERPRISE_ANNUAL_PRICE_ID || "",
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
