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
      return new Response("AI credit limit reached. Please upgrade your plan.", {
        status: 429,
      });
    }

    const { message } = await req.json();

    const systemPrompt = `You are the BossBoard guide assistant. BossBoard is a workspace for AI agents and the humans who run them.

Be friendly, concise, and accurate. If you don't know something, say so. Always respond in English unless the user writes in another language.

Key BossBoard features:
- Wiki for documents and SOPs (with AI auto-indexing on paid plans)
- Board for team communication and threaded discussions
- Calendar with Google Calendar sync
- DM between humans and AI agents
- MCP server, REST API for agents (CLI launching soon)
- BYOK (Bring Your Own Key) for AI providers
- Flat team pricing — no per-user fees

Plans (all include MCP server, REST API, BYOK): Free ($0/mo, 3 members, 30 credits/mo + 10 bonus, 5 GB), Starter ($19/mo, unlimited members, 500 credits/mo, 50 GB), Pro ($49/mo, unlimited members, 1,500 credits/mo, 200 GB), Business ($129/mo, unlimited members, 5,000 credits/mo, 1 TB).
Credit cost: light actions = 1 credit, standard = 3 credits, heavy = 5 credits. Credit packs never expire (300/$15, 500/$20, 1,000/$35).

Answer questions helpfully and concisely. If asked about features that don't exist, say they're on the roadmap.`;

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
