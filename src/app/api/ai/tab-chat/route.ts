import { createClient } from "@/lib/supabase/server";
import { checkCredits, deductCredit, CREDIT_COSTS } from "@/lib/ai/credits";
import { checkRateLimit } from "@/lib/rate-limit";
import { callAI } from "@/lib/ai/provider";

const TAB_SYSTEM_PROMPTS: Record<string, string> = {
  wiki: "You are a Wiki AI assistant. Help users create/edit SOPs and documents. Respond concisely.",
  board:
    "You are a Board AI assistant. Help users draft posts and summarize discussions. Respond concisely.",
  calendar:
    "You are a Calendar AI assistant. Help users manage events and scheduling. Respond concisely.",
  checklist:
    "You are a Checklist AI assistant. Help users create and improve checklists. Respond concisely.",
  todo: "You are a Todo AI assistant. Help users organize and prioritize tasks. Respond concisely.",
};

const VALID_TABS = new Set(Object.keys(TAB_SYSTEM_PROMPTS));

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Rate limit: 20 requests per minute per user
    if (!checkRateLimit(`tab-chat:${user.id}`, 20, 60_000)) {
      return new Response("Too many requests. Please wait a minute.", {
        status: 429,
      });
    }

    const { tab, message, context } = await req.json();

    if (!tab || !VALID_TABS.has(tab)) {
      return Response.json({ error: "Invalid tab" }, { status: 400 });
    }

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return Response.json({ error: "Message is required" }, { status: 400 });
    }

    // Get user profile and plan
    const { data: profile } = await supabase
      .from("profiles")
      .select("plan_id")
      .eq("id", user.id)
      .single();

    const planId =
      (profile?.plan_id as "free" | "starter" | "pro" | "business") ?? "free";

    if (planId === "free") {
      return new Response("Upgrade to use Tab AI chat.", { status: 403 });
    }

    // Get user's business
    const { data: businesses } = await supabase
      .from("businesses")
      .select("id, ai_provider")
      .eq("user_id", user.id)
      .limit(1);

    const businessId = businesses?.[0]?.id ?? "";

    // Check if BYOK is active
    const aiConfig = businesses?.[0]?.ai_provider as {
      provider: string;
      keys: Record<string, string>;
    } | null;
    const isByok =
      aiConfig?.provider === "anthropic" && !!aiConfig.keys?.anthropic;

    // Credit check (skip if BYOK)
    if (!isByok) {
      const cost = CREDIT_COSTS.chat;
      const creditCheck = await checkCredits(user.id, planId, cost);
      if (!creditCheck.allowed) {
        return new Response(
          "AI credit limit reached. Please upgrade your plan.",
          { status: 429 }
        );
      }
    }

    // Build system prompt with optional context
    let systemPrompt = TAB_SYSTEM_PROMPTS[tab];
    if (context && typeof context === "object") {
      const contextStr = Object.entries(context)
        .map(([k, v]) => `${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`)
        .join("\n");
      if (contextStr) {
        systemPrompt += `\n\nCurrent context:\n${contextStr}`;
      }
    }

    const result = await callAI({
      businessId,
      system: systemPrompt,
      prompt: message,
      model: "claude-haiku-4-5-20251001",
      maxOutputTokens: 1024,
    });

    // Deduct credit after success (skip if BYOK)
    if (result.provider !== "anthropic_byok") {
      deductCredit(user.id, businessId, "chat", CREDIT_COSTS.chat).catch(
        console.error
      );
    }

    if (!result.text || !result.text.trim()) {
      return Response.json(
        { error: "AI returned empty response. Please try again." },
        { status: 500 }
      );
    }

    return Response.json({
      reply: result.text,
      provider: result.provider,
    });
  } catch (error) {
    console.error("Tab AI chat error:", error);
    return Response.json(
      { error: "Failed to generate AI response" },
      { status: 500 }
    );
  }
}
