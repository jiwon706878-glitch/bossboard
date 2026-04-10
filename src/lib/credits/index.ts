"use client";

import { createClient } from "@/lib/supabase/client";
import { CREDIT_CONFIG, type ActionName } from "@/config/credits";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CreditBalance {
  monthly: number;
  monthlyUsed: number;
  purchased: number;
  purchasedUsed: number;
  available: number;
}

export interface ChargeResult {
  amount: number;
  source: "monthly" | "purchased";
}

// ---------------------------------------------------------------------------
// getBalance — read the current credit_balances row for a business
// ---------------------------------------------------------------------------

export async function getBalance(businessId: string): Promise<CreditBalance> {
  const supabase = createClient();
  const { data } = await supabase
    .from("credit_balances")
    .select("*")
    .eq("business_id", businessId)
    .single();

  if (!data) {
    return { monthly: 0, monthlyUsed: 0, purchased: 0, purchasedUsed: 0, available: 0 };
  }

  const monthlyAvailable = Math.max(0, data.credits_monthly - data.credits_monthly_used);
  const purchasedAvailable = Math.max(0, data.credits_purchased - data.credits_purchased_used);

  return {
    monthly: data.credits_monthly,
    monthlyUsed: data.credits_monthly_used,
    purchased: data.credits_purchased,
    purchasedUsed: data.credits_purchased_used,
    available: monthlyAvailable + purchasedAvailable,
  };
}

// ---------------------------------------------------------------------------
// canAfford — check whether a business can pay for an action
// ---------------------------------------------------------------------------

export async function canAfford(businessId: string, actionName: ActionName): Promise<boolean> {
  const balance = await getBalance(businessId);
  const action = CREDIT_CONFIG.actions[actionName];
  return balance.available >= action.credits;
}

// ---------------------------------------------------------------------------
// chargeCredits — deduct credits (monthly first, then purchased) + log usage
// ---------------------------------------------------------------------------

export async function chargeCredits(
  businessId: string,
  userId: string,
  actionName: ActionName
): Promise<ChargeResult> {
  const supabase = createClient();
  const balance = await getBalance(businessId);
  const action = CREDIT_CONFIG.actions[actionName];
  const cost = action.credits;

  if (balance.available < cost) {
    throw new Error("Insufficient credits");
  }

  // Deduct from monthly first, then purchased
  const monthlyAvailable = Math.max(0, balance.monthly - balance.monthlyUsed);
  const monthlyCharge = Math.min(cost, monthlyAvailable);
  const purchasedCharge = cost - monthlyCharge;
  const source: "monthly" | "purchased" = purchasedCharge > 0 ? "purchased" : "monthly";

  const { error: updateError } = await supabase
    .from("credit_balances")
    .update({
      credits_monthly_used: balance.monthlyUsed + monthlyCharge,
      credits_purchased_used: balance.purchasedUsed + purchasedCharge,
      updated_at: new Date().toISOString(),
    })
    .eq("business_id", businessId);

  if (updateError) throw updateError;

  // Also log to ai_usage for backward compatibility and analytics
  await supabase.from("ai_usage").insert({
    user_id: userId,
    business_id: businessId,
    feature: actionName,
    credits_used: cost,
  });

  return { amount: cost, source };
}

// ---------------------------------------------------------------------------
// refundCredits — return credits to the pool they came from
// ---------------------------------------------------------------------------

export async function refundCredits(
  businessId: string,
  amount: number,
  source: "monthly" | "purchased" = "monthly"
) {
  const supabase = createClient();
  const balance = await getBalance(businessId);

  const update =
    source === "monthly"
      ? { credits_monthly_used: Math.max(0, balance.monthlyUsed - amount) }
      : { credits_purchased_used: Math.max(0, balance.purchasedUsed - amount) };

  const { error } = await supabase
    .from("credit_balances")
    .update({ ...update, updated_at: new Date().toISOString() })
    .eq("business_id", businessId);

  if (error) throw error;
}

// ---------------------------------------------------------------------------
// checkAbuse — detect rapid-fire failures that might indicate abuse
// ---------------------------------------------------------------------------

export async function checkAbuse(
  userId: string
): Promise<{ blocked: boolean; failureCount: number }> {
  const supabase = createClient();
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { count } = await supabase
    .from("ai_usage")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("feature", "failure")
    .gte("created_at", oneHourAgo);

  const failureCount = count ?? 0;
  const blocked = failureCount >= CREDIT_CONFIG.abuse.maxFailuresPerHour;

  return { blocked, failureCount };
}

// ---------------------------------------------------------------------------
// recordFailure — log a failed AI call for abuse tracking
// ---------------------------------------------------------------------------

export async function recordFailure(userId: string, businessId: string) {
  const supabase = createClient();

  await supabase.from("ai_usage").insert({
    user_id: userId,
    business_id: businessId,
    feature: "failure",
    credits_used: 0,
  });
}

// ---------------------------------------------------------------------------
// resetMonthlyCredits — zero out monthly usage (called by cron/edge fn)
// ---------------------------------------------------------------------------

export async function resetMonthlyCredits(businessId: string) {
  const supabase = createClient();

  const { error } = await supabase
    .from("credit_balances")
    .update({
      credits_monthly_used: 0,
      updated_at: new Date().toISOString(),
    })
    .eq("business_id", businessId);

  if (error) throw error;
}

// ---------------------------------------------------------------------------
// addPurchasedCredits — top up purchased credits after a payment
// ---------------------------------------------------------------------------

export async function addPurchasedCredits(businessId: string, amount: number) {
  const supabase = createClient();
  const balance = await getBalance(businessId);

  const { error } = await supabase
    .from("credit_balances")
    .update({
      credits_purchased: balance.purchased + amount,
      updated_at: new Date().toISOString(),
    })
    .eq("business_id", businessId);

  if (error) throw error;
}

// ---------------------------------------------------------------------------
// initializeCredits — create a credit_balances row for a new business
// ---------------------------------------------------------------------------

export async function initializeCredits(
  businessId: string,
  planId: keyof typeof CREDIT_CONFIG.plans = "free"
) {
  const supabase = createClient();
  const plan = CREDIT_CONFIG.plans[planId];

  const { error } = await supabase.from("credit_balances").insert({
    business_id: businessId,
    credits_monthly: plan.monthlyCredits,
    credits_monthly_used: 0,
    credits_purchased: plan.signupBonus,
    credits_purchased_used: 0,
  });

  if (error) throw error;
}
