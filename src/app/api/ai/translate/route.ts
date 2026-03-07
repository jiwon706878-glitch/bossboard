import { streamText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { createClient } from "@/lib/supabase/server";
import { checkCredits, deductCredit, CREDIT_COSTS } from "@/lib/ai/credits";
import { buildBusinessContext, BUSINESS_PROFILE_SELECT } from "@/lib/ai/business-context";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { businessId, text, targetLanguage } = await req.json();

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan_id")
    .eq("id", user.id)
    .single();

  const planId = (profile?.plan_id as "free" | "pro" | "business" | "enterprise") ?? "free";

  const cost = CREDIT_COSTS.translation;
  const creditCheck = await checkCredits(user.id, planId, cost);
  if (!creditCheck.allowed) {
    return new Response("AI credit limit reached. Please upgrade your plan.", {
      status: 429,
    });
  }

  // Get business info for context-aware translations
  const { data: business } = await supabase
    .from("businesses")
    .select(BUSINESS_PROFILE_SELECT)
    .eq("id", businessId)
    .single();

  const businessContext = business ? buildBusinessContext(business) : "";

  const result = streamText({
    model: anthropic("claude-sonnet-4-20250514"),
    system: `${businessContext ? businessContext + "\n\n" : ""}Your role: Professional translator.
Translate the following text into ${targetLanguage}.
Maintain the original tone, formatting, and intent.
If the text contains hashtags, translate them appropriately for the target language while keeping them as hashtags.
Only output the translated text, nothing else.`,
    prompt: text,
  });

  deductCredit(user.id, businessId, "translation", cost).catch(console.error);

  return result.toTextStreamResponse();
}
