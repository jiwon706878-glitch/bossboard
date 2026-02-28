import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPlanByPaddlePriceId } from "@/config/plans";

// Paddle sends webhooks as POST with JSON body + Paddle-Signature header
export async function POST(req: Request) {
  const body = await req.text();

  // TODO: verify webhook signature once PADDLE_WEBHOOK_SECRET is configured
  // const signature = req.headers.get("paddle-signature");

  let event: {
    event_type: string;
    data: Record<string, unknown>;
  };

  try {
    event = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const supabase = createAdminClient();

  switch (event.event_type) {
    case "subscription.created":
    case "subscription.activated": {
      const data = event.data;
      const customData = (data.custom_data ?? {}) as Record<string, string>;
      const userId = customData.user_id;
      if (!userId) break;

      const items = data.items as Array<{ price: { id: string } }>;
      const priceId = items?.[0]?.price?.id;
      const plan = priceId ? getPlanByPaddlePriceId(priceId) : undefined;

      const currentPeriod = data.current_billing_period as {
        starts_at: string;
        ends_at: string;
      } | null;

      await supabase.from("subscriptions").upsert({
        user_id: userId,
        paddle_subscription_id: data.id as string,
        paddle_price_id: priceId || null,
        plan_id: plan?.id || "starter",
        status: "active",
        current_period_start: currentPeriod?.starts_at || null,
        current_period_end: currentPeriod?.ends_at || null,
      });

      await supabase
        .from("profiles")
        .update({ plan_id: plan?.id || "starter" })
        .eq("id", userId);

      break;
    }

    case "subscription.updated": {
      const data = event.data;
      const items = data.items as Array<{ price: { id: string } }>;
      const priceId = items?.[0]?.price?.id;
      const plan = priceId ? getPlanByPaddlePriceId(priceId) : undefined;
      const subscriptionId = data.id as string;

      const currentPeriod = data.current_billing_period as {
        starts_at: string;
        ends_at: string;
      } | null;

      const scheduledChange = data.scheduled_change as {
        action: string;
      } | null;

      const { data: sub } = await supabase
        .from("subscriptions")
        .select("user_id")
        .eq("paddle_subscription_id", subscriptionId)
        .single();

      if (sub) {
        await supabase
          .from("subscriptions")
          .update({
            paddle_price_id: priceId || null,
            plan_id: plan?.id || "free",
            status: (data.status as string) === "active" ? "active" : (data.status as string),
            current_period_start: currentPeriod?.starts_at || null,
            current_period_end: currentPeriod?.ends_at || null,
            cancel_at_period_end: scheduledChange?.action === "cancel",
          })
          .eq("paddle_subscription_id", subscriptionId);

        await supabase
          .from("profiles")
          .update({ plan_id: plan?.id || "free" })
          .eq("id", sub.user_id);
      }

      break;
    }

    case "subscription.canceled": {
      const data = event.data;
      const subscriptionId = data.id as string;

      const { data: sub } = await supabase
        .from("subscriptions")
        .select("user_id")
        .eq("paddle_subscription_id", subscriptionId)
        .single();

      if (sub) {
        await supabase
          .from("subscriptions")
          .update({ status: "canceled", plan_id: "free" })
          .eq("paddle_subscription_id", subscriptionId);

        await supabase
          .from("profiles")
          .update({ plan_id: "free" })
          .eq("id", sub.user_id);
      }

      break;
    }

    case "subscription.past_due": {
      const data = event.data;
      const subscriptionId = data.id as string;

      await supabase
        .from("subscriptions")
        .update({ status: "past_due" })
        .eq("paddle_subscription_id", subscriptionId);

      break;
    }

    case "transaction.completed": {
      // Transaction completed — subscription is handled above,
      // this can be used for one-time purchases if needed
      break;
    }
  }

  return NextResponse.json({ received: true });
}
