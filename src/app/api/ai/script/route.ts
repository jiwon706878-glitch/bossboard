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

  const { businessId, format, topic, audience } = await req.json();

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan_id")
    .eq("id", user.id)
    .single();

  const planId = (profile?.plan_id as "free" | "starter" | "pro" | "business") ?? "free";

  const cost = CREDIT_COSTS.script;
  const creditCheck = await checkCredits(user.id, planId, cost);
  if (!creditCheck.allowed) {
    return new Response("AI credit limit reached. Please upgrade your plan.", {
      status: 429,
    });
  }

  const { data: business } = await supabase
    .from("businesses")
    .select(BUSINESS_PROFILE_SELECT)
    .eq("id", businessId)
    .single();

  const businessContext = buildBusinessContext(business ?? {});

  const formatGuide: Record<string, string> = {
    tiktok: "TikTok video (15-60 seconds, fast-paced, trendy)",
    reel: "Instagram Reel (15-90 seconds, polished, visual)",
    youtube_short: "YouTube Short (under 60 seconds, educational/entertaining)",
    story: "Instagram/Facebook Story (15 seconds, casual, behind-the-scenes)",
    testimonial: "Customer testimonial video (30-90 seconds, authentic)",
  };

  const result = streamText({
    model: anthropic("claude-sonnet-4-20250514"),
    system: `${businessContext}

Your role: Short-form video scriptwriter.
Write a script for a ${formatGuide[format] || format}.
Target audience: ${audience || "general local audience"}.

Format your response EXACTLY like this (include ALL sections):

---HOOK---
(Write 2-3 attention-grabbing opening lines. Include a pattern interrupt or curiosity gap to stop the scroll.)

---BODY---
(Write the main content, 4-6 sentences. Keep it conversational and authentic.)

---CTA---
(Write a clear call-to-action, 1-2 sentences. Include what to do, why, and urgency.)

---SCENE COMPOSITION---
(Describe 3-4 specific shots/scenes with camera angles, framing, and transitions between each scene.)

---TEXT OVERLAYS---
(List 3-5 on-screen text suggestions with timing, e.g., "0:03 — Bold text: 'Wait for it...'")

---MUSIC & SOUND---
(Suggest 2-3 music styles/genres or trending sounds that fit the mood. Include tempo and energy level.)

---THUMBNAIL CONCEPT---
(Describe an eye-catching thumbnail: background, text, expression/pose, colors.)

---HOOK ALTERNATIVES---
(Write 2 alternative hook options with different angles — e.g., question-based, shock value, or relatable statement.)

Keep it conversational and authentic. No corporate speak.`,
    prompt: `Topic: ${topic}
Format: ${format}
Write the script:`,
  });

  deductCredit(user.id, businessId, "script", cost).catch(console.error);

  return result.toTextStreamResponse();
}
