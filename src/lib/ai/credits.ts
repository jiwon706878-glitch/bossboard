import { createClient } from "@/lib/supabase/server";
import { plans, type PlanId } from "@/config/plans";

export async function getMonthlyUsage(userId: string) {
  const supabase = await createClient();
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const { data, error } = await supabase
    .from("ai_usage")
    .select("credits_used, feature")
    .eq("user_id", userId)
    .gte("created_at", startOfMonth.toISOString());

  if (error) throw error;

  const total = data?.reduce((sum, row) => sum + row.credits_used, 0) ?? 0;
  const byFeature = data?.reduce(
    (acc, row) => {
      acc[row.feature] = (acc[row.feature] || 0) + row.credits_used;
      return acc;
    },
    {} as Record<string, number>
  );

  return { total, byFeature };
}

export async function checkCredits(
  userId: string,
  planId: PlanId
): Promise<{ allowed: boolean; remaining: number; limit: number }> {
  const plan = plans[planId];
  const limit = plan.limits.aiCredits;

  if (limit === -1) {
    return { allowed: true, remaining: Infinity, limit: -1 };
  }

  const { total } = await getMonthlyUsage(userId);
  const remaining = limit - total;

  return {
    allowed: remaining > 0,
    remaining: Math.max(0, remaining),
    limit,
  };
}

export async function deductCredit(
  userId: string,
  businessId: string,
  feature: string,
  credits: number = 1
) {
  const supabase = await createClient();

  const { error } = await supabase.from("ai_usage").insert({
    user_id: userId,
    business_id: businessId,
    feature,
    credits_used: credits,
  });

  if (error) throw error;
}
