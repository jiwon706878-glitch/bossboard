"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { plans, type PlanId } from "@/config/plans";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { toast } from "sonner";

export default function BillingPage() {
  const [currentPlan, setCurrentPlan] = useState<PlanId>("free");
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    if (searchParams.get("success")) {
      toast.success("Subscription activated!");
    }
    if (searchParams.get("canceled")) {
      toast.info("Checkout canceled");
    }
  }, [searchParams]);

  useEffect(() => {
    async function loadPlan() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      setUserId(user.id);
      setUserEmail(user.email ?? null);

      const { data: profile } = await supabase
        .from("profiles")
        .select("plan_id")
        .eq("id", user.id)
        .single();

      if (profile?.plan_id) {
        setCurrentPlan(profile.plan_id as PlanId);
      }
    }
    loadPlan();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const openCheckout = useCallback(
    async (priceId: string) => {
      if (!userId || !priceId) return;
      setLoading(priceId);

      try {
        // Dynamically import Paddle.js to open checkout overlay
        const { getPaddleInstance } = await import("@paddle/paddle-js");
        const paddle = getPaddleInstance();

        if (!paddle) {
          toast.error("Paddle not initialized. Please refresh the page.");
          setLoading(null);
          return;
        }

        paddle.Checkout.open({
          items: [{ priceId, quantity: 1 }],
          customData: { user_id: userId },
          ...(userEmail ? { customer: { email: userEmail } } : {}),
          settings: {
            successUrl: `${window.location.origin}/dashboard/billing?success=true`,
          },
        });
      } catch (err) {
        console.error("Paddle checkout error:", err);
        toast.error("Failed to open checkout");
      }

      setLoading(null);
    },
    [userId, userEmail]
  );

  const planOrder: PlanId[] = ["free", "pro", "business", "enterprise"];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Billing</h1>
        <p className="text-muted-foreground">
          Manage your subscription and billing.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <p className="text-2xl font-bold">{plans[currentPlan].name}</p>
            <p className="text-sm text-muted-foreground">
              {plans[currentPlan].description}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {planOrder.map((planId) => {
          const plan = plans[planId];
          const isCurrent = planId === currentPlan;
          const isPro = planId === "business";

          return (
            <Card
              key={planId}
              className={
                isPro
                  ? "border-primary shadow-lg"
                  : isCurrent
                    ? "border-primary/50"
                    : ""
              }
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  {isCurrent && <Badge>Current</Badge>}
                  {isPro && !isCurrent && (
                    <Badge variant="secondary">Popular</Badge>
                  )}
                </div>
                <p className="text-3xl font-bold">
                  ${plan.monthlyPrice}
                  <span className="text-sm font-normal text-muted-foreground">
                    /mo
                  </span>
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2 text-sm"
                    >
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      {feature}
                    </li>
                  ))}
                </ul>
                {!isCurrent && planId !== "free" && (
                  <Button
                    className="w-full"
                    variant={isPro ? "default" : "outline"}
                    onClick={() => openCheckout(plan.paddlePriceIdMonthly)}
                    disabled={
                      loading === plan.paddlePriceIdMonthly ||
                      !plan.paddlePriceIdMonthly
                    }
                  >
                    {loading === plan.paddlePriceIdMonthly
                      ? "Loading..."
                      : "Upgrade"}
                  </Button>
                )}
                {isCurrent && (
                  <Button className="w-full" variant="outline" disabled>
                    Current Plan
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
