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

  const { businessId, format, topic, audience } = await req.json();

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan_id")
    .eq("id", user.id)
    .single();

  const planId = (profile?.plan_id as "free" | "pro" | "business" | "enterprise") ?? "free";

  const creditCheck = await checkCredits(user.id, planId);
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

  const formatGuide: Record<string, string> = {
    tiktok: "TikTok video (15-60 seconds, fast-paced, trendy)",
    reel: "Instagram Reel (15-90 seconds, polished, visual)",
    youtube_short: "YouTube Short (under 60 seconds, educational/entertaining)",
    story: "Instagram/Facebook Story (15 seconds, casual, behind-the-scenes)",
    testimonial: "Customer testimonial video (30-90 seconds, authentic)",
  };

  const result = streamText({
    model: anthropic("claude-sonnet-4-20250514"),
    system: `You are a short-form video scriptwriter for "${business?.name}", a ${business?.type} business.
Write a script for a ${formatGuide[format] || format}.
Target audience: ${audience || "general local audience"}.

Format your response EXACTLY like this:
---HOOK---
(Write an attention-grabbing opening line, 1-2 sentences)

---BODY---
(Write the main content, 3-5 sentences)

---CTA---
(Write a clear call-to-action, 1-2 sentences)

---FILMING GUIDE---
(Write 3-5 bullet points with filming tips: camera angles, transitions, text overlays, music suggestions)

Keep it conversational and authentic. No corporate speak.`,
    prompt: `Topic: ${topic}
Format: ${format}
Write the script:`,
  });

  deductCredit(user.id, businessId, "script").catch(console.error);

  return result.toTextStreamResponse();
}
