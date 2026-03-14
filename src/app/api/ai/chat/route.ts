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

  const { text } = await generateText({
    model: anthropic("claude-haiku-4-5-20251001"),
    system: `You are the BossBoard AI assistant. BossBoard is an AI-powered operations control tower for business owners.

Key features:
- AI SOP Generation: Create detailed standard operating procedures from a simple topic description
- Team Management: Invite team members, track SOP reads, assign checklists
- Operations Dashboard: Monitor team compliance, get AI-driven insights
- SOP Wiki: Searchable library of all your procedures

Plans: Free ($0/mo, 5 SOPs, 5 AI generations), Starter ($19/mo, 50 SOPs), Pro ($49/mo, unlimited), Business ($129/mo, everything + API + SSO)

Answer questions helpfully and concisely. If asked about features that don't exist, say they're on the roadmap.`,
    prompt: message,
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
}
