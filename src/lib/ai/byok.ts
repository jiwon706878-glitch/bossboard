import { createAnthropic } from "@ai-sdk/anthropic";
import { createClient } from "@/lib/supabase/server";

/**
 * BYOK resolver — reads the current user's Anthropic key from
 * `profiles.external_api_keys` (plaintext map written by the settings
 * UI) and returns a configured `createAnthropic` provider bound to
 * that key.
 *
 * BB v2.0 Day 5: user-facing AI routes (SOP generation, reformat,
 * tab chat, file convert, receipt OCR) use this helper instead of
 * the ambient `anthropic(...)` provider that was backed by
 * BossBoard's own API key + a credit quota. If the user has no
 * Anthropic key registered, the routes return 402 Payment Required
 * with `action: 'connect_provider'` and the client can deep-link
 * the user to Settings → External API Keys.
 *
 * The guide chatbot (/api/ai/chat) and the auto-indexer stay
 * BB-funded via the router (Gemini Flash) — they do not use this
 * helper.
 *
 * A separate encrypted BYOK path exists at `businesses.ai_provider`
 * but no UI writes to it; we read from the path users actually
 * populate in Settings.
 */

export interface ByokResult {
  ok: true;
  model: ReturnType<ReturnType<typeof createAnthropic>>;
  provider: "anthropic_byok";
}

export interface ByokMissing {
  ok: false;
  reason: "no_key" | "free_plan" | "unauthenticated";
}

const DEFAULT_MODEL = "claude-haiku-4-5-20251001";

/**
 * Resolves a BYOK-backed Anthropic model for the current session.
 * Callers pass an optional explicit model ID; otherwise the default
 * Haiku model is used.
 */
export async function resolveAnthropicModel(
  modelId: string = DEFAULT_MODEL
): Promise<ByokResult | ByokMissing> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "unauthenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan_id, external_api_keys")
    .eq("id", user.id)
    .single();

  const planId = profile?.plan_id ?? "free";
  if (planId === "free") {
    return { ok: false, reason: "free_plan" };
  }

  const keys = (profile?.external_api_keys ?? {}) as Record<
    string,
    string | undefined
  >;
  const anthropicKey = keys.anthropic;
  if (!anthropicKey || typeof anthropicKey !== "string") {
    return { ok: false, reason: "no_key" };
  }

  const provider = createAnthropic({ apiKey: anthropicKey });
  return {
    ok: true,
    model: provider(modelId),
    provider: "anthropic_byok",
  };
}

/**
 * Standard JSON error responses for the BYOK failure modes. Kept
 * here so every AI route returns the same shape and the client can
 * deep-link based on `action`.
 */
export function byokErrorResponse(reason: ByokMissing["reason"]) {
  switch (reason) {
    case "unauthenticated":
      return {
        status: 401,
        body: { error: "Unauthorized" },
      };
    case "free_plan":
      return {
        status: 402,
        body: {
          error: "AI features require Starter or higher",
          action: "upgrade_plan",
          upgrade_url: "/dashboard/billing",
        },
      };
    case "no_key":
      return {
        status: 402,
        body: {
          error:
            "No AI provider connected. Add an Anthropic key in Settings → External API Keys.",
          action: "connect_provider",
          settings_url: "/dashboard/settings#external-api-keys",
        },
      };
  }
}
