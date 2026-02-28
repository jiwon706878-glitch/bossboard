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

  const { businessId, reviews } = await req.json();

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan_id")
    .eq("id", user.id)
    .single();

  const planId = (profile?.plan_id as "free" | "pro" | "business" | "enterprise") ?? "free";

  const cost = CREDIT_COSTS.review_insights;
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

  const { text } = await generateText({
    model: anthropic("claude-sonnet-4-20250514"),
    system: `You are a customer review analyst for "${business?.name}", a ${business?.type} business.
Analyze the provided customer reviews and generate a comprehensive insights report.

You MUST respond in valid JSON format with this exact structure:
{
  "overallSentiment": "positive" | "mixed" | "negative",
  "sentimentBreakdown": { "positive": number, "neutral": number, "negative": number },
  "averageRating": number,
  "totalReviews": number,
  "topThemes": [{ "theme": string, "count": number, "sentiment": "positive" | "neutral" | "negative" }],
  "topPraises": [string, string, string],
  "topComplaints": [string, string, string],
  "keywords": [{ "word": string, "count": number }],
  "actionItems": [string, string, string],
  "summary": string
}

- sentimentBreakdown values should be counts (not percentages)
- topThemes: identify 4-6 recurring themes
- keywords: extract 8-10 most mentioned keywords/phrases
- actionItems: provide 3 specific, actionable suggestions
- summary: write a 2-3 sentence executive summary
Only output valid JSON, nothing else.`,
    prompt: `Analyze these ${reviews.length} reviews:\n\n${reviews.map((r: string, i: number) => `Review ${i + 1}: ${r}`).join("\n\n")}`,
  });

  deductCredit(user.id, businessId, "review_insights", cost).catch(console.error);

  try {
    const insights = JSON.parse(text);
    return Response.json({ insights });
  } catch {
    return new Response("Failed to parse AI response", { status: 500 });
  }
}
