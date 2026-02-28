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

  const { businessId, description, tone, platform } = await req.json();

  // Get user plan
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan_id")
    .eq("id", user.id)
    .single();

  const planId = (profile?.plan_id as "free" | "pro" | "business" | "enterprise") ?? "free";

  const cost = CREDIT_COSTS.caption;
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
    system: `You are a social media caption writer for "${business?.name}", a ${business?.type} business.
Write an engaging ${tone} caption for ${platform || "Instagram"}.
Include a hook, body, and call-to-action.
After the caption, add a line break and then 10-15 relevant hashtags on a single line separated by spaces.
Format: First the caption text, then "---HASHTAGS---" on its own line, then the hashtags.
Keep the caption under 150 words. Make it scroll-stopping.`,
    prompt: `Post description: ${description}
Tone: ${tone}
Write the caption:`,
  });

  deductCredit(user.id, businessId, "caption", cost).catch(console.error);

  return result.toTextStreamResponse();
}
