"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { plans, type PlanId } from "@/config/plans";

const planOrder: PlanId[] = ["free", "pro", "business", "enterprise"];

export function PricingToggle() {
  const [annual, setAnnual] = useState(false);

  return (
    <div>
      <div className="mb-8 flex items-center justify-center gap-3">
        <Label htmlFor="billing" className="text-sm">Monthly</Label>
        <Switch id="billing" checked={annual} onCheckedChange={setAnnual} />
        <Label htmlFor="billing" className="text-sm">
          Annual <Badge variant="secondary" className="ml-1">Save 17%</Badge>
        </Label>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {planOrder.map((planId) => {
          const plan = plans[planId];
          const price = annual ? plan.annualPrice : plan.monthlyPrice;
          const isPro = planId === "business";

          return (
            <Card key={planId} className={isPro ? "border-primary shadow-lg relative" : "relative"}>
              {isPro && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary">Most Popular</Badge>
                </div>
              )}
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="pt-2">
                  <span className="text-4xl font-bold">
                    ${annual ? Math.round(price / 12) : price}
                  </span>
                  <span className="text-muted-foreground">/mo</span>
                  {annual && price > 0 && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      ${price}/year
                    </p>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Link href="/signup" className="w-full">
                  <Button className="w-full" variant={isPro ? "default" : "outline"}>
                    {planId === "free" ? "Start Free" : "Get Started"}
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
