"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { plans, type PlanId } from "@/config/plans";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Check, Ticket } from "lucide-react";
import { toast } from "sonner";

export default function BillingPage() {
  const [currentPlan, setCurrentPlan] = useState<PlanId>("free");
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  // User-redeemed coupon state — a discount coupon's paddle_discount_id
  // is stashed here after successful /api/coupons/redeem and takes
  // precedence over the global promotion at checkout.
  const [couponCode, setCouponCode] = useState("");
  const [couponDiscountCode, setCouponDiscountCode] = useState<string | null>(
    null
  );
  const [couponLabel, setCouponLabel] = useState<string | null>(null);
  const [couponSubmitting, setCouponSubmitting] = useState(false);
  const searchParams = useSearchParams();
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
        // Trusted server-side check: the API returns a discount code
        // only while a promotion is still active. A user-redeemed
        // coupon (in couponDiscountCode state) takes precedence over
        // the global promotion.
        let discountCode: string | null = couponDiscountCode;
        if (!discountCode) {
          try {
            const res = await fetch("/api/promotions/active", {
              cache: "no-store",
            });
            if (res.ok) {
              const data = (await res.json()) as {
                discountCode: string | null;
              };
              discountCode = data.discountCode;
            }
          } catch {
            // Fall through — checkout still proceeds without promo.
          }
        }

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
          ...(discountCode ? { discountCode } : {}),
          settings: {
            successUrl: `${window.location.origin}/dashboard/billing?success=true`,
          },
        });
      } catch {
        toast.error("Failed to open checkout");
      }

      setLoading(null);
    },
    [userId, userEmail, couponDiscountCode]
  );

  async function redeemCoupon(e: React.FormEvent) {
    e.preventDefault();
    const code = couponCode.trim();
    if (!code) return;
    setCouponSubmitting(true);
    try {
      const res = await fetch("/api/coupons/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg =
          {
            not_found: "Coupon not found",
            expired: "Coupon expired",
            exhausted: "Coupon has no uses left",
            already_redeemed: "You already redeemed this coupon",
            no_business: "Create a business first",
            code_required: "Enter a code",
          }[data.error as string] ?? "Failed to redeem";
        toast.error(msg);
        return;
      }
      if (data.type === "credits") {
        toast.success(`+${data.creditAmount} credits added!`);
        setCouponCode("");
      } else {
        // discount — stash for the next checkout click
        if (!data.paddleDiscountId) {
          toast.error("Coupon is not configured for checkout");
          return;
        }
        setCouponDiscountCode(data.paddleDiscountId);
        const label =
          data.discountType === "percent"
            ? `${data.discountValue}% off`
            : `$${data.discountValue} off`;
        setCouponLabel(label);
        setCouponCode("");
        toast.success(`Coupon applied: ${label}`);
      }
    } catch {
      toast.error("Failed to redeem");
    } finally {
      setCouponSubmitting(false);
    }
  }

  function clearCoupon() {
    setCouponDiscountCode(null);
    setCouponLabel(null);
  }

  const planOrder: PlanId[] = ["free", "starter", "pro", "business"];

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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Ticket className="h-4 w-4" /> Have a coupon?
          </CardTitle>
        </CardHeader>
        <CardContent>
          {couponDiscountCode ? (
            <div className="flex items-center justify-between gap-3 rounded-md border border-green-500/30 bg-green-500/10 px-4 py-3">
              <div className="text-sm">
                <span className="font-semibold text-green-700 dark:text-green-400">
                  ✓ Coupon applied
                </span>
                {couponLabel && (
                  <span className="ml-2 text-muted-foreground">
                    ({couponLabel}) — applied at checkout
                  </span>
                )}
              </div>
              <Button size="sm" variant="ghost" onClick={clearCoupon}>
                Remove
              </Button>
            </div>
          ) : (
            <form onSubmit={redeemCoupon} className="flex gap-2">
              <Input
                placeholder="BB-XXXXXXXX"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                className="font-mono"
              />
              <Button type="submit" disabled={couponSubmitting || !couponCode.trim()}>
                {couponSubmitting ? "..." : "Redeem"}
              </Button>
            </form>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            Credit coupons add to your balance instantly. Discount coupons
            apply automatically on your next upgrade.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 stagger-children">
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
