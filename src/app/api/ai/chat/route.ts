import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { createClient } from "@/lib/supabase/server";
import { checkCredits, deductCredit, CREDIT_COSTS } from "@/lib/ai/credits";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Get user plan
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan_id")
    .eq("id", user.id)
    .single();

  const planId =
    (profile?.plan_id as "free" | "pro" | "business" | "enterprise") ?? "free";

  // Only Pro, Business, Enterprise can use AI chat
  if (planId === "free") {
    return new Response("Upgrade to Pro to use AI Assistant", { status: 403 });
  }

  const cost = CREDIT_COSTS.chat;
  const creditCheck = await checkCredits(user.id, planId, cost);
  if (!creditCheck.allowed) {
    return new Response("AI credit limit reached. Please upgrade your plan.", {
      status: 429,
    });
  }

  const { message } = await req.json();

  const { text } = await generateText({
    model: anthropic("claude-haiku-4-5-20251001"),
    system: `You are BossBoard's friendly AI assistant. Help users with questions about BossBoard — an AI-powered dashboard for local business owners.

Key facts:
- Three modules: Review AI, Social AI, Content Studio
- Free plan: 30 credits/mo. Pro: $19.99/mo (1,000 credits). Business: $39.99/mo (unlimited). Enterprise: $79.99/mo.
- Supports Instagram, Facebook, TikTok, X (Twitter), and LinkedIn
- Cancel anytime from account settings

Be concise, friendly, and helpful. Keep responses under 3 sentences when possible.`,
    prompt: message,
  });

  // Deduct credit after successful generation
  // Use first business or empty string
  const { data: businesses } = await supabase
    .from("businesses")
    .select("id")
    .eq("user_id", user.id)
    .limit(1);

  const businessId = businesses?.[0]?.id ?? "";
  deductCredit(user.id, businessId, "chat", cost).catch(console.error);

  return Response.json({ reply: text });
}
