import { streamText } from "ai";
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

  const { businessId, promoDetails, audience, tone } = await req.json();

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan_id")
    .eq("id", user.id)
    .single();

  const planId = (profile?.plan_id as "free" | "pro" | "business" | "enterprise") ?? "free";

  const cost = CREDIT_COSTS.email_marketing;
  const creditCheck = await checkCredits(user.id, planId, cost);
  if (!creditCheck.allowed) {
    return new Response("AI credit limit reached. Please upgrade your plan.", {
      status: 429,
    });
  }

  const { data: business } = await supabase
    .from("businesses")
    .select("name, type")
    .eq("id", businessId)
    .single();

  const result = streamText({
    model: anthropic("claude-sonnet-4-20250514"),
    system: `You are an email marketing copywriter for "${business?.name}", a ${business?.type} business.
Write a ${tone} marketing email.
Target audience: ${audience || "existing customers"}.

Format your response EXACTLY like this:

---SUBJECT LINE---
(Write a compelling subject line that gets opens, under 60 characters)

---PREVIEW TEXT---
(Write preview/preheader text, 40-90 characters)

---EMAIL BODY---
(Write the full email body with greeting, main content, and sign-off. Use short paragraphs. Include a clear CTA.)

Keep it genuine, not spammy. Focus on value to the reader.
Only output the formatted sections, nothing else.`,
    prompt: `Promotion/Topic: ${promoDetails}
Audience: ${audience || "existing customers"}
Tone: ${tone}
Write the email:`,
  });

  deductCredit(user.id, businessId, "email_marketing", cost).catch(console.error);

  return result.toTextStreamResponse();
}
