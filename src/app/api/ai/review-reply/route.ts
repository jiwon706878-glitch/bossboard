import { streamText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { createClient } from "@/lib/supabase/server";
import { checkCredits, deductCredit } from "@/lib/ai/credits";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { businessId, reviewerName, rating, reviewText, tone } =
    await req.json();

  // Get user plan
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan_id")
    .eq("id", user.id)
    .single();

  const planId = (profile?.plan_id as "free" | "starter" | "pro" | "agency") ?? "free";

  // Check credits
  const creditCheck = await checkCredits(user.id, planId);
  if (!creditCheck.allowed) {
    return new Response("AI credit limit reached. Please upgrade your plan.", {
      status: 429,
    });
  }

  // Get business info
  const { data: business } = await supabase
    .from("businesses")
    .select("name, type")
    .eq("id", businessId)
    .single();

  const result = streamText({
    model: anthropic("claude-sonnet-4-20250514"),
    system: `You are a review response assistant for "${business?.name}", a ${business?.type} business.
Write a ${tone} reply to the following customer review.
Keep it concise (2-4 sentences), genuine, and helpful.
If the review is negative, acknowledge the concern, apologize, and offer to make it right.
If the review is positive, express gratitude and invite them back.
Do not use generic phrases. Make it feel personal.
Only output the reply text, nothing else.`,
    prompt: `Reviewer: ${reviewerName}
Rating: ${rating}/5 stars
Review: "${reviewText}"

Write a ${tone} reply:`,
  });

  // Deduct credit after starting stream
  deductCredit(user.id, businessId, "review_reply").catch(console.error);

  return result.toTextStreamResponse();
}
