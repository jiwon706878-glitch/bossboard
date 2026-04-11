import {
  GoogleGenerativeAI,
  SchemaType,
  type ResponseSchema,
} from "@google/generative-ai";

/**
 * Gemini client for BossBoard's background AI (auto-indexing, guide
 * chatbot, etc). Gemini 2.5 Flash is the primary model — it's ~10x
 * cheaper than Claude Haiku and supports structured JSON output via
 * `responseSchema`, which we use to keep the auto-indexer's output
 * shape stable without post-parsing.
 *
 * `callAIWithFallback` in `./router.ts` wraps these calls and falls
 * back to Claude Haiku if Gemini is down — callers should prefer
 * the router in most cases.
 */

if (!process.env.GOOGLE_AI_API_KEY) {
  // Don't throw at import time — the module may be loaded in routes
  // that never call Gemini (e.g., via tree-shaking in a type-only
  // import). Throw only when a call is actually made.
  console.warn(
    "[ai/gemini] GOOGLE_AI_API_KEY is not set — Gemini calls will throw."
  );
}

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY ?? "");

const MODEL = "gemini-2.5-flash";

/**
 * Call Gemini with a JSON Schema and get back a typed parsed object.
 *
 * NOTE on schema shape: `@google/generative-ai` expects schemas that
 * use its `SchemaType` enum (not JSON Schema draft keywords). The
 * auto-indexer passes a `ResponseSchema` built with `SchemaType`.
 */
export async function generateWithSchema<T>(
  prompt: string,
  schema: ResponseSchema,
  system?: string
): Promise<T> {
  const model = genAI.getGenerativeModel({
    model: MODEL,
    ...(system ? { systemInstruction: system } : {}),
    generationConfig: {
      temperature: 0.3,
      responseMimeType: "application/json",
      responseSchema: schema,
    },
  });

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  return JSON.parse(text) as T;
}

/** Plain-text completion — no schema enforcement. */
export async function callGeminiText(
  prompt: string,
  system?: string
): Promise<string> {
  const model = genAI.getGenerativeModel({
    model: MODEL,
    ...(system ? { systemInstruction: system } : {}),
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 2048,
    },
  });
  const result = await model.generateContent(prompt);
  return result.response.text();
}

/**
 * Re-export SchemaType for callers that need to build a schema
 * without importing the SDK directly.
 */
export { SchemaType };
export type { ResponseSchema };
