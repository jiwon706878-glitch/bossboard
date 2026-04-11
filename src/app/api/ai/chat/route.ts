import { createClient } from "@/lib/supabase/server";
import { checkCredits, deductCredit, CREDIT_COSTS } from "@/lib/ai/credits";
import { checkRateLimit } from "@/lib/rate-limit";
import { callAIWithFallback } from "@/lib/ai/router";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }

    if (!checkRateLimit(`ai:${user.id}`, 20, 60_000)) {
      return new Response("Too many requests. Please wait a minute.", { status: 429 });
    }

    // Get user plan
    const { data: profile } = await supabase
      .from("profiles")
      .select("plan_id")
      .eq("id", user.id)
      .single();

    const planId =
      (profile?.plan_id as "free" | "starter" | "pro" | "business") ?? "free";

    // Only Pro and Business can use AI chat
    if (planId === "free") {
      return new Response("Upgrade to Pro to use AI Assistant", { status: 403 });
    }

    const cost = CREDIT_COSTS.chat;
    const creditCheck = await checkCredits(user.id, planId, cost);
    if (!creditCheck.allowed) {
      return new Response("AI usage limit reached for this billing period. Please upgrade your plan.", {
        status: 429,
      });
    }

    const { message } = await req.json();

    const systemPrompt = `You are the BossBoard guide assistant. BossBoard is a workspace where humans and AI agents actually collaborate — the tagline is "Hire AI Agents. Manage Them Like a Pro."

Be friendly, concise, and accurate. If you don't know something, say so. Always respond in English unless the user writes in another language.

Key BossBoard features:
- Wiki, Board, DM, Calendar, Todos in one workspace
- Agent accounts with names, roles, permissions, activity logs, and heartbeats
- AI auto-indexing on save (smart search) on paid plans
- Google Calendar sync
- MCP server + REST API on every plan (dedicated CLI launching soon)
- BYOK (Bring Your Own Key) — connect your Anthropic/Gemini/OpenAI key and pay the provider directly
- Flat team pricing — no per-user fees

Plans (all include MCP + REST API + BYOK):
- Free: $0/mo — 3 humans + 3 AI agents, 5 GB storage
- Starter: $19/mo — unlimited humans, up to 10 AI agents, 50 GB storage, smart search + AI chat
- Pro: $49/mo — up to 50 AI agents, 200 GB storage, read tracking, activity dashboard
- Business: $129/mo — unlimited AI agents, 1 TB storage, advanced folder access, onboarding paths

Beta launch bonus: the first 100 subscribers on each paid plan get a 30% lifetime discount — no other trial is currently live.

Answer questions helpfully and concisely. If asked about features that don't exist, say they're on the roadmap. Do not mention internal credit balances or credit pack pricing to prospects — BossBoard is positioned as BYOK-first.`;

    // Gemini Flash primary, Claude Haiku fallback. System prompt is
    // passed through the dedicated system channel of each provider.
    const text = await callAIWithFallback<string>(message, {
      system: systemPrompt,
    });

    // Deduct credit after successful generation
    // Use first business or empty string
    const { data: businesses } = await supabase
      .from("businesses")
      .select("id")
      .eq("user_id", user.id)
      .limit(1);

    const businessId = businesses?.[0]?.id ?? "";
    deductCredit(user.id, businessId, "chat", cost).catch(console.error);

    return Response.json({ reply: text });
  } catch (error) {
    console.error("AI chat error:", error);
    return Response.json({ error: "Failed to generate AI response" }, { status: 500 });
  }
}
