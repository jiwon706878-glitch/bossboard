import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import {
  callGeminiText,
  generateWithSchema,
  type ResponseSchema,
} from "./gemini";

/**
 * Unified AI call with Gemini-primary, Claude-fallback semantics.
 *
 * Gemini 2.5 Flash is the default — cheaper and fast enough for the
 * background work (auto-indexing, guide chatbot). If Gemini fails
 * (rate limit, outage, schema rejection) we retry the same prompt
 * against Claude Haiku via the existing Vercel AI SDK setup so the
 * user-facing flow never hard-fails on a provider hiccup.
 *
 * `system` is passed to each provider's dedicated system channel
 * (Gemini `systemInstruction`, Claude `system` param) — not folded
 * into the user prompt — so instruction adherence stays strong.
 *
 * Callers with structured output needs pass `schema` — the Claude
 * fallback has to JSON-parse the response manually since Haiku
 * doesn't use the Gemini-style `responseSchema` API.
 */
export interface CallOptions {
  system?: string;
  schema?: ResponseSchema;
}

export async function callAIWithFallback<T = string>(
  prompt: string,
  options: CallOptions = {}
): Promise<T> {
  const { system, schema } = options;

  // Primary: Gemini
  try {
    if (schema) {
      const parsed = await generateWithSchema<T>(prompt, schema, system);
      return parsed;
    }
    const text = await callGeminiText(prompt, system);
    return text as unknown as T;
  } catch (error) {
    console.error(
      "[ai/router] Gemini failed, falling back to Claude Haiku:",
      (error as Error).message
    );
  }

  // Fallback: Claude Haiku via Vercel AI SDK (already installed)
  const { text } = await generateText({
    model: anthropic("claude-haiku-4-5-20251001"),
    ...(system ? { system } : {}),
    prompt: schema
      ? `${prompt}\n\nRespond with ONLY a valid JSON object. No markdown fences, no prose.`
      : prompt,
    maxOutputTokens: 2048,
  });

  if (schema) {
    // Claude sometimes wraps in ```json fences — strip them.
    const cleaned = text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    return JSON.parse(cleaned) as T;
  }

  return text as unknown as T;
}
