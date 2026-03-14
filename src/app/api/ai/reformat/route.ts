import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkCredits, deductCredit, CREDIT_COSTS } from "@/lib/ai/credits";
import { buildBusinessContext, BUSINESS_PROFILE_SELECT } from "@/lib/ai/business-context";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { businessId, text } = await req.json();

  if (!text || typeof text !== "string") {
    return NextResponse.json({ error: "Text is required" }, { status: 400 });
  }

  if (text.length > 10000) {
    return NextResponse.json({ error: "Text must be under 10,000 characters" }, { status: 400 });
  }

  // Resolve business ID
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
      return NextResponse.json(
        { error: "No business found. Please complete onboarding first." },
        { status: 400 }
      );
    }
  }

  // Credit check
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan_id")
    .eq("id", user.id)
    .single();

  const planId = (profile?.plan_id as "free" | "starter" | "pro" | "business") ?? "free";

  const cost = CREDIT_COSTS.sop_reformat;
  const creditCheck = await checkCredits(user.id, planId, cost);
  if (!creditCheck.allowed) {
    return NextResponse.json(
      { error: "AI credit limit reached. Please upgrade your plan." },
      { status: 429 }
    );
  }

  const { data: business } = await supabase
    .from("businesses")
    .select(BUSINESS_PROFILE_SELECT)
    .eq("id", resolvedBusinessId)
    .single();

  const businessContext = buildBusinessContext(business ?? {});

  // Sanitize
  const sanitizedText = text
    .replace(/```/g, "")
    .replace(/system:/gi, "")
    .replace(/\bignore\b.*\binstructions?\b/gi, "")
    .trim();

  try {
    const result = await generateText({
      model: anthropic("claude-sonnet-4-20250514"),
      system: `${businessContext}

You are an expert operations consultant. The user has an existing SOP or procedure document that needs to be reformatted into a clean, structured format.

Reformat the provided text into:
1. Title
2. Purpose (1-2 sentences)
3. Scope (who this applies to)
4. Step-by-step procedure (numbered, clear, actionable)
5. Safety/compliance notes (if applicable)
6. Checklist summary (extractable items)

Preserve ALL original information. Do not add new steps that aren't implied by the original text.
Keep language simple. Write for someone doing this task for the first time.
Do NOT use markdown headers with #. Use plain numbered sections.
Write the reformatted SOP content directly without any preamble.`,
      prompt: `Here is the existing SOP text to reformat:\n\n${sanitizedText}\n\nReformat this into a structured SOP:`,
    });

    deductCredit(user.id, resolvedBusinessId, "sop_reformat", cost).catch(console.error);

    return NextResponse.json({ text: result.text });
  } catch (error) {
    console.error("SOP reformat error:", error);
    return NextResponse.json(
      { error: `AI reformat failed: ${error instanceof Error ? error.message : "Unknown error"}` },
      { status: 500 }
    );
  }
}
