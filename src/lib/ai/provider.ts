import { generateText } from "ai";
import { anthropic, createAnthropic } from "@ai-sdk/anthropic";
import { createClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/encryption";

interface AICallOpts {
  businessId: string;
  system: string;
  prompt: string;
  maxOutputTokens?: number;
  model?: string;
}

interface AIResult {
  text: string;
  provider: "bossboard" | "anthropic_byok";
}

export async function callAI(opts: AICallOpts): Promise<AIResult> {
  const supabase = await createClient();
  const modelId = opts.model ?? "claude-haiku-4-5-20251001";

  // Check if business has BYOK configured
  const { data: biz } = await supabase
    .from("businesses")
    .select("ai_provider")
    .eq("id", opts.businessId)
    .single();

  const aiConfig = biz?.ai_provider as {
    provider: string;
    keys: Record<string, string>;
  } | null;

  if (aiConfig?.provider === "anthropic" && aiConfig.keys?.anthropic) {
    try {
      const key = decrypt(aiConfig.keys.anthropic);
      const byokProvider = createAnthropic({ apiKey: key });
      const { text } = await generateText({
        model: byokProvider(modelId),
        system: opts.system,
        prompt: opts.prompt,
        maxOutputTokens: opts.maxOutputTokens ?? 1024,
      });
      return { text, provider: "anthropic_byok" };
    } catch (error) {
      // BYOK failed — fall back to BossBoard's key
      console.error("BYOK call failed, falling back to BossBoard key:", error);
    }
  }

  // Default: use BossBoard's key
  const { text } = await generateText({
    model: anthropic(modelId),
    system: opts.system,
    prompt: opts.prompt,
    maxOutputTokens: opts.maxOutputTokens ?? 1024,
  });
  return { text, provider: "bossboard" };
}
