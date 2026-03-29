"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { plans, type PlanId } from "@/config/plans";

const planOrder: PlanId[] = ["free", "starter", "pro", "business"];

export function PricingToggle() {
  const [annual, setAnnual] = useState(false);

  return (
    <div>
      {/* Billing toggle */}
      <div className="mb-10 flex items-center justify-center gap-4">
        <span
          className="text-sm font-medium"
          style={{ color: annual ? "var(--muted-foreground)" : "var(--foreground)" }}
        >
          Monthly
        </span>
        <button
          onClick={() => setAnnual(!annual)}
          className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200"
          style={{
            backgroundColor: annual ? "#4F8BFF" : "var(--border)",
          }}
          role="switch"
          aria-checked={annual}
        >
          <span
            className="inline-block h-4 w-4 rounded-full transition-transform duration-200"
            style={{
              backgroundColor: "var(--foreground)",
              transform: annual ? "translateX(24px)" : "translateX(4px)",
            }}
          />
        </button>
        <span
          className="text-sm font-medium flex items-center gap-2"
          style={{ color: annual ? "var(--foreground)" : "var(--muted-foreground)" }}
        >
          Annual
          <span
            className="rounded-md px-2 py-0.5 text-xs font-semibold"
            style={{
              backgroundColor: "rgba(52, 211, 153, 0.1)",
              color: "#34D399",
              border: "1px solid rgba(52, 211, 153, 0.2)",
            }}
          >
            Save 17%
          </span>
        </span>
      </div>

      {/* Plan cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {planOrder.map((planId) => {
          const plan = plans[planId];
          const price = annual ? plan.annualPrice : plan.monthlyPrice;
          const isRecommended = planId === "starter";

          return (
            <div
              key={planId}
              className="relative flex flex-col rounded-md p-6"
              style={{
                backgroundColor: "var(--card)",
                border: isRecommended
                  ? "1px solid #4F8BFF"
                  : "1px solid var(--border)",
                ...(isRecommended
                  ? { marginTop: "-8px", paddingTop: "32px", paddingBottom: "32px" }
                  : {}),
              }}
            >
              {isRecommended && (
                <div
                  className="absolute -top-3 left-1/2 -translate-x-1/2"
                >
                  <span
                    className="rounded-md px-3 py-1 text-xs font-semibold"
                    style={{
                      backgroundColor: "#4F8BFF",
                      color: "var(--primary-foreground)",
                    }}
                  >
                    Most Popular
                  </span>
                </div>
              )}

              <div>
                <h3
                  className="text-lg font-semibold"
                  style={{
                    color: "var(--foreground)",
                    fontFamily: "'A2Z', sans-serif",
                  }}
                >
                  {plan.name}
                </h3>
                <p
                  className="mt-1 text-sm"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {plan.description}
                </p>
                <div className="mt-4">
                  <span
                    className="text-3xl font-bold"
                    style={{
                      color: "var(--foreground)",
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    ${annual && price > 0 ? Math.round(price / 12) : price}
                  </span>
                  <span
                    className="text-sm ml-1"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    /mo
                  </span>
                  {annual && price > 0 && (
                    <p
                      className="mt-1 text-xs"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      ${price}/year
                    </p>
                  )}
                </div>
              </div>

              <ul className="mt-6 space-y-2.5 flex-1">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2 text-sm"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    <Check
                      className="mt-0.5 h-4 w-4 shrink-0"
                      style={{ color: "#34D399" }}
                    />
                    {feature}
                  </li>
                ))}
              </ul>

              <Link
                href="/signup"
                className="mt-6 block w-full rounded-md px-4 py-2.5 text-center text-sm font-semibold transition-colors duration-150"
                style={{
                  backgroundColor: isRecommended ? "#4F8BFF" : "transparent",
                  color: isRecommended ? "#FFFFFF" : "#8B95B0",
                  border: isRecommended
                    ? "1px solid #4F8BFF"
                    : "1px solid var(--border)",
                  fontFamily: "'A2Z', sans-serif",
                }}
                onMouseEnter={(e) => {
                  if (isRecommended) {
                    e.currentTarget.style.backgroundColor = "#6BA0FF";
                  } else {
                    e.currentTarget.style.borderColor = "#4F8BFF";
                    e.currentTarget.style.color = "#E8ECF4";
                  }
                }}
                onMouseLeave={(e) => {
                  if (isRecommended) {
                    e.currentTarget.style.backgroundColor = "#4F8BFF";
                  } else {
                    e.currentTarget.style.borderColor = "var(--border)";
                    e.currentTarget.style.color = "#8B95B0";
                  }
                }}
              >
                {planId === "free" ? "Start Free" : "Get Started"}
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
