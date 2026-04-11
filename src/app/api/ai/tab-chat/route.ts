import { generateText } from "ai";
import { createClient } from "@/lib/supabase/server";
import { resolveAnthropicModel, byokErrorResponse } from "@/lib/ai/byok";
import { checkRateLimit } from "@/lib/rate-limit";

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

/**
 * Tab AI chat — BB v2.0 Day 5 made this BYOK-only. The old flow
 * credit-deducted on BossBoard's Anthropic key; now we require a
 * user-registered key and return 402 otherwise. The guide chatbot
 * at /api/ai/chat remains BB-funded for zero-friction onboarding.
 */
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }

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

    // BYOK resolver — blocks Free plan and users without an
    // Anthropic key with 402 + action hint.
    const byok = await resolveAnthropicModel("claude-haiku-4-5-20251001");
    if (!byok.ok) {
      const err = byokErrorResponse(byok.reason);
      return Response.json(err.body, { status: err.status });
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

    const result = await generateText({
      model: byok.model,
      system: systemPrompt,
      prompt: message,
      maxOutputTokens: 1024,
    });

    if (!result.text || !result.text.trim()) {
      return Response.json(
        { error: "AI returned empty response. Please try again." },
        { status: 500 }
      );
    }

    return Response.json({
      reply: result.text,
      provider: "anthropic_byok",
    });
  } catch (error) {
    console.error("Tab AI chat error:", error);
    return Response.json(
      { error: "Failed to generate AI response" },
      { status: 500 }
    );
  }
}
