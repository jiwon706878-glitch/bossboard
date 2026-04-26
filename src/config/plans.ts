export type PlanId = "free" | "starter" | "pro" | "business";

/**
 * Plan limits. BB v2.0 Day 5 removed `aiCredits` entirely — BYOK is
 * the only path for AI features on paid plans, and Free is blocked
 * from AI features with an upgrade prompt. The guide chatbot and
 * auto-indexer are BB-funded (Gemini Flash) and don't need a credit
 * quota because they're fixed-surface features, not per-action.
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
    sops: number;                 // -1 = unlimited
    teamMembers: number;          // -1 = unlimited humans
    agentMembers: number;         // -1 = unlimited agents; BB v2.0 cap
    storageGb: number;            // total storage in GB
    fileSizeMb: number;           // per-file upload limit in MB
    egressGbPerMonth: number;     // monthly download bandwidth in GB
    autoIndexing: boolean;        // Gemini auto-index on save
    aiChat: boolean;              // in-app AI chat with workspace
  };
  /** BB v3.0 desktop-app limits — additive, does not replace `limits`. */
  v3Limits: {
    devices: number;              // -1 = unlimited
    workspaces: number;           // -1 = unlimited
    cloudSync: {
      dms: boolean;               // sync DM messages across devices
      board: boolean;
      calendar: boolean;
    };
    aiMeeting: false | "basic" | "full";
    smartSearch: boolean;
    teamCollaboration: boolean;
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
      sops: 20,
      teamMembers: 3,
      agentMembers: 3,
      storageGb: 5,
      fileSizeMb: 50,
      egressGbPerMonth: 10,
      autoIndexing: false,
      aiChat: false,
    },
    v3Limits: {
      devices: 1,                 // 1 device only on Free
      workspaces: 1,
      cloudSync: { dms: false, board: true, calendar: true }, // DMs local-only
      aiMeeting: false,
      smartSearch: false,
      teamCollaboration: false,
    },
    features: [
      "3 AI agents",
      "1 device",
      "DMs stay on this device (local only)",
      "Wiki, Board, Calendar, Todos, Meetings",
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
      sops: -1,
      teamMembers: -1,
      agentMembers: 10,
      storageGb: 50,
      fileSizeMb: 200,
      egressGbPerMonth: 100,
      autoIndexing: true,
      aiChat: true,
    },
    v3Limits: {
      devices: 2,                 // PC + mobile
      workspaces: 1,
      cloudSync: { dms: true, board: true, calendar: true },
      aiMeeting: "basic",
      smartSearch: false,
      teamCollaboration: false,
    },
    features: [
      "10 AI agents",
      "2 devices (PC + mobile)",
      "DM cloud sync across devices",
      "Everything in Free",
      "Basic AI Meeting Room",
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
      sops: -1,
      teamMembers: -1,
      agentMembers: 50,
      storageGb: 200,
      fileSizeMb: 2000,
      egressGbPerMonth: 500,
      autoIndexing: true,
      aiChat: true,
    },
    v3Limits: {
      devices: -1,
      workspaces: 3,
      cloudSync: { dms: true, board: true, calendar: true },
      aiMeeting: "full",
      smartSearch: true,
      teamCollaboration: false,
    },
    features: [
      "50 AI agents",
      "Unlimited devices",
      "DM cloud sync",
      "AI Meeting Room (full discussion mode)",
      "Smart Search (semantic)",
      "Everything in Starter",
      "Priority support (24h response)",
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
      sops: -1,
      teamMembers: -1,
      agentMembers: -1,
      storageGb: 1024,
      fileSizeMb: 10240,
      egressGbPerMonth: 2048,
      autoIndexing: true,
      aiChat: true,
    },
    v3Limits: {
      devices: -1,
      workspaces: -1,
      cloudSync: { dms: true, board: true, calendar: true },
      aiMeeting: "full",
      smartSearch: true,
      teamCollaboration: true,
    },
    features: [
      "Unlimited AI agents",
      "Unlimited devices + workspaces",
      "Team collaboration (shared workspaces)",
      "Everything in Pro",
      "Dedicated Slack channel for support",
      "Early access to new features",
    ],
  },
};

/**
 * Beta launch promo. First 100 paying users get 30% lifetime discount.
 * Tracked separately in the promotions table; this constant is the source
 * of truth for the count + percent shown in pricing UI.
 */
export const BETA_DISCOUNT = {
  percent: 30,
  lifetime: true,
  totalSlots: 100,
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
