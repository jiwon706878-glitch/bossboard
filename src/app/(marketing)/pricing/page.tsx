import type { Metadata } from "next";
import Link from "next/link";
import { Check, X } from "lucide-react";

export const metadata: Metadata = {
  title: "Pricing — BossBoard",
  description:
    "Simple, transparent pricing. BYOK — bring your own AI keys. First 100 paying users get 30% off forever.",
};

interface PlanCard {
  name: string;
  price: string;
  betaPrice: string | null;
  description: string;
  highlighted: boolean;
  features: Array<{ text: string; included: boolean; bold?: boolean }>;
  cta: string;
  href: string;
}

const PLANS: PlanCard[] = [
  {
    name: "Free",
    price: "$0",
    betaPrice: null,
    description: "Try the full experience",
    highlighted: false,
    features: [
      { text: "Unlimited local files", included: true },
      { text: "3 AI agents", included: true },
      { text: "1 device", included: true },
      { text: "All AI providers (BYOK)", included: true },
      { text: "Library, Calendar, Meetings", included: true },
      { text: "Basic AI Meeting Room", included: true },
      { text: "MCP server", included: true },
      { text: "Community support", included: true },
      { text: "DM cloud sync", included: false },
      { text: "Smart Search (semantic)", included: false },
    ],
    cta: "Get Started Free",
    href: "/download",
  },
  {
    name: "Starter",
    price: "$19.80/mo",
    betaPrice: "$13.86/mo",
    description: "For regular users",
    highlighted: false,
    features: [
      { text: "Everything in Free", included: true, bold: true },
      { text: "10 AI agents", included: true },
      { text: "2 devices (PC + mobile)", included: true },
      { text: "DM cloud sync", included: true },
      { text: "Token Usage dashboard", included: true },
      { text: "Priority support", included: true },
      { text: "Email Integration (Pro+)", included: false },
      { text: "MCP Client (Pro+)", included: false },
    ],
    cta: "Start Trial",
    href: "/desktop",
  },
  {
    name: "Pro",
    price: "$49.50/mo",
    betaPrice: "$34.65/mo",
    description: "For power users",
    highlighted: true,
    features: [
      { text: "Everything in Starter", included: true, bold: true },
      { text: "50 AI agents", included: true },
      { text: "Unlimited devices", included: true },
      { text: "⭐ Email Integration (Gmail / Outlook / IMAP)", included: true },
      { text: "⭐ MCP Client (external integrations)", included: true },
      { text: "Full AI Meeting Room (Free Discussion)", included: true },
      { text: "Smart Search (semantic, v3.2)", included: true },
    ],
    cta: "Start Trial",
    href: "/desktop",
  },
  {
    name: "Business",
    price: "$129.90/mo",
    betaPrice: "$90.93/mo",
    description: "For teams (flat rate)",
    highlighted: false,
    features: [
      { text: "Everything in Pro", included: true, bold: true },
      { text: "Unlimited everything", included: true },
      { text: "Team workspace (v3.2)", included: true },
      { text: "Admin Controls (member management)", included: true },
      { text: "⭐ Priority feature requests", included: true },
      { text: "Email support", included: true },
    ],
    cta: "Contact Sales",
    href: "mailto:jay@mybossboard.com",
  },
];

export default function PricingPage() {
  return (
    <main className="py-20 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-3">Simple, transparent pricing</h1>
          <p className="text-muted-foreground">
            BYOK. No markup on AI. No per-user fees on Business.
          </p>
          <div className="inline-block mt-4 px-4 py-2 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 text-sm font-medium">
            🎉 Beta launch: First 100 users get 30% off forever
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-2xl border-2 p-6 flex flex-col ${
                plan.highlighted
                  ? "border-primary shadow-xl lg:scale-105"
                  : "border-border"
              }`}
            >
              {plan.highlighted && (
                <div className="text-xs font-semibold text-primary -mt-9 mb-4 self-start px-2 py-1 bg-primary/10 rounded">
                  RECOMMENDED
                </div>
              )}

              <h3 className="text-xl font-bold">{plan.name}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {plan.description}
              </p>

              <div className="mb-6">
                {plan.betaPrice ? (
                  <>
                    <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                      {plan.betaPrice}
                    </div>
                    <div className="text-sm text-muted-foreground line-through">
                      {plan.price}
                    </div>
                    <div className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                      First 100 users only
                    </div>
                  </>
                ) : (
                  <div className="text-3xl font-bold">{plan.price}</div>
                )}
              </div>

              <ul className="space-y-2 mb-6 flex-1 text-sm">
                {plan.features.map((f) => (
                  <li key={f.text} className="flex items-start gap-2">
                    {f.included ? (
                      <Check className="size-4 text-green-600 mt-0.5 shrink-0" />
                    ) : (
                      <X className="size-4 text-muted-foreground mt-0.5 shrink-0" />
                    )}
                    <span
                      className={`${f.bold ? "font-medium" : ""} ${
                        !f.included ? "text-muted-foreground line-through" : ""
                      }`}
                    >
                      {f.text}
                    </span>
                  </li>
                ))}
              </ul>

              <Link
                href={plan.href}
                className={`w-full text-center px-4 py-2.5 rounded-lg font-medium transition-colors ${
                  plan.highlighted
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "border border-border hover:bg-muted"
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-12 max-w-2xl mx-auto">
          BYOK = your AI usage goes directly to your provider (Google, Anthropic,
          OpenAI, xAI, or local Ollama). BossBoard never marks up AI costs.
          14-day refund. Cancel anytime.
        </p>
      </div>
    </main>
  );
}
