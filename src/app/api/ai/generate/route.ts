import { generateText } from "ai";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveAnthropicModel, byokErrorResponse } from "@/lib/ai/byok";
import { buildBusinessContext, BUSINESS_PROFILE_SELECT } from "@/lib/ai/business-context";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!checkRateLimit(`ai:${user.id}`, 20, 60_000)) {
    return NextResponse.json({ error: "Too many requests. Please wait a minute." }, { status: 429 });
  }

  const { businessId, topic, category } = await req.json();

  // Input validation
  if (!topic || typeof topic !== "string") {
    return NextResponse.json({ error: "Topic is required" }, { status: 400 });
  }

  if (topic.length > 1000) {
    return NextResponse.json({ error: "Topic must be under 1000 characters" }, { status: 400 });
  }

  // Resolve and verify business ownership
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
  } else {
    // Verify user has access to the provided businessId
    const [{ data: ownedBiz }, { data: membership }] = await Promise.all([
      supabase.from("businesses").select("id").eq("id", resolvedBusinessId).eq("user_id", user.id).maybeSingle(),
      supabase.from("business_members").select("user_id").eq("business_id", resolvedBusinessId).eq("user_id", user.id).maybeSingle(),
    ]);
    if (!ownedBiz && !membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  // Strip potential prompt injection attempts
  const sanitizedTopic = topic
    .replace(/```/g, "")
    .replace(/system:/gi, "")
    .replace(/\bignore\b.*\binstructions?\b/gi, "")
    .trim();

  // BYOK resolver — returns a user-key-backed Anthropic model or
  // the shape of an error response if the user is free-plan or
  // hasn't registered a key. See src/lib/ai/byok.ts.
  const byok = await resolveAnthropicModel("claude-sonnet-4-20250514");
  if (!byok.ok) {
    const err = byokErrorResponse(byok.reason);
    return NextResponse.json(err.body, { status: err.status });
  }

  const { data: business } = await supabase
    .from("businesses")
    .select(BUSINESS_PROFILE_SELECT)
    .eq("id", resolvedBusinessId)
    .single();

  const businessContext = buildBusinessContext(business ?? {});
  const categoryContext = category ? `\nCategory: ${category}` : "";

  try {
    const result = await generateText({
      model: byok.model,
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
      prompt: `Topic: ${sanitizedTopic}\n\nGenerate the SOP:`,
    });

    return NextResponse.json({ text: result.text });
  } catch (error) {
    console.error("SOP generation error:", error);
    return NextResponse.json(
      { error: `AI generation failed: ${error instanceof Error ? error.message : "Unknown error"}` },
      { status: 500 }
    );
  }
}
