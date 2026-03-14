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

  const { businessId, topic, category } = await req.json();

  // Input validation
  if (!topic || typeof topic !== "string") {
    return new Response("Topic is required", { status: 400 });
  }

  if (topic.length > 1000) {
    return new Response("Topic must be under 1000 characters", { status: 400 });
  }

  // If no businessId provided, try to find the user's first business
  let resolvedBusinessId = businessId;
  if (!resolvedBusinessId || typeof resolvedBusinessId !== "string") {
    const { data: userBusinesses } = await supabase
      .from("businesses")
      .select("id")
      .eq("user_id", user.id)
      .limit(1);

    if (userBusinesses && userBusinesses.length > 0) {
      resolvedBusinessId = userBusinesses[0].id;
    } else {
      return new Response("No business found. Please complete onboarding first.", { status: 400 });
    }
  }

  // Strip potential prompt injection attempts
  const sanitizedTopic = topic
    .replace(/```/g, "")
    .replace(/system:/gi, "")
    .replace(/\bignore\b.*\binstructions?\b/gi, "")
    .trim();

  // Get user plan
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan_id")
    .eq("id", user.id)
    .single();

  const planId = (profile?.plan_id as "free" | "starter" | "pro" | "business") ?? "free";

  const cost = CREDIT_COSTS.sop_generate;
  const creditCheck = await checkCredits(user.id, planId, cost);
  if (!creditCheck.allowed) {
    return new Response("AI credit limit reached. Please upgrade your plan.", {
      status: 429,
    });
  }

  const { data: business } = await supabase
    .from("businesses")
    .select(BUSINESS_PROFILE_SELECT)
    .eq("id", resolvedBusinessId)
    .single();

  const businessContext = buildBusinessContext(business ?? {});

  const categoryContext = category ? `\nCategory: ${category}` : "";

  try {
    const result = streamText({
      model: anthropic("claude-sonnet-4-20250514"),
      system: `${businessContext}

You are an expert operations consultant. Generate a detailed, actionable Standard Operating Procedure (SOP).

Industry: ${business?.type || "general"}${categoryContext}

Output format:
1. Title
2. Purpose (1-2 sentences)
3. Scope (who this applies to)
4. Step-by-step procedure (numbered, clear, actionable)
5. Safety/compliance notes (if applicable)
6. Checklist summary (extractable items)

Keep language simple. Write for someone doing this task for the first time.
Do NOT use markdown headers with #. Use plain numbered sections.
Write the SOP content directly without any preamble.`,
      prompt: `Topic: ${sanitizedTopic}

Generate the SOP:`,
    });

    deductCredit(user.id, resolvedBusinessId, "sop_generate", cost).catch(console.error);

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("SOP generation error:", error);
    return new Response(
      `AI generation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      { status: 500 }
    );
  }
}
