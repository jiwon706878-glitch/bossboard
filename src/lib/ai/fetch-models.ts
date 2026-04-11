/**
 * Live model discovery for BYOK providers.
 *
 * Each provider exposes a `/v1/models` (or equivalent) endpoint that
 * lists the models the holder of a given API key is entitled to call.
 * By querying these at runtime — and caching in the /api/ai/available-
 * models route — BossBoard never has to ship a hardcoded model list
 * that goes stale the moment a provider releases a new model.
 *
 * Every fetcher returns `[]` on failure (network error, 401, 5xx) so
 * the caller can silently skip a broken provider without blowing up
 * the whole dropdown. Errors are logged to stdout for ops visibility
 * but never thrown.
 */

export type ProviderId = "anthropic" | "google" | "openai" | "grok";

export interface ProviderModel {
  id: string;
  name: string;
  provider: ProviderId;
}

// Per-provider timeout. The /v1/models endpoints are usually fast
// (<500ms) but an upstream incident could hang a fetch long enough
// to stall the whole Promise.all in the route handler. 5 seconds is
// generous for a simple list endpoint and keeps the UI responsive.
const FETCH_TIMEOUT_MS = 5000;

/**
 * Wrapper around `fetch` that aborts the request after `FETCH_TIMEOUT_MS`
 * and routes the AbortError through the caller's normal "return []" path.
 */
async function fetchWithTimeout(
  url: string,
  init: RequestInit
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchModelsForProvider(
  provider: ProviderId,
  apiKey: string
): Promise<ProviderModel[]> {
  if (!apiKey || typeof apiKey !== "string") return [];
  try {
    switch (provider) {
      case "anthropic":
        return await fetchAnthropicModels(apiKey);
      case "google":
        return await fetchGoogleModels(apiKey);
      case "openai":
        return await fetchOpenAIModels(apiKey);
      case "grok":
        return await fetchGrokModels(apiKey);
    }
  } catch (error) {
    console.error(`[fetch-models] ${provider} threw`, error);
    return [];
  }
}

// ─── Anthropic ──────────────────────────────────────────────────────────────
async function fetchAnthropicModels(apiKey: string): Promise<ProviderModel[]> {
  const res = await fetchWithTimeout("https://api.anthropic.com/v1/models", {
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
  });
  if (!res.ok) {
    console.error("[fetch-models] anthropic", res.status, await safeText(res));
    return [];
  }
  const data = (await res.json()) as { data?: Array<{ id: string; display_name?: string }> };
  return (data.data ?? []).map((m) => ({
    id: m.id,
    name: m.display_name || m.id,
    provider: "anthropic" as const,
  }));
}

// ─── Google Gemini ──────────────────────────────────────────────────────────
async function fetchGoogleModels(apiKey: string): Promise<ProviderModel[]> {
  // The Google AI API takes the key as a query param. Encode it so a
  // key with unusual characters can't break the URL.
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`;
  const res = await fetchWithTimeout(url, {});
  if (!res.ok) {
    console.error("[fetch-models] google", res.status, await safeText(res));
    return [];
  }
  const data = (await res.json()) as {
    models?: Array<{
      name: string;
      displayName?: string;
      supportedGenerationMethods?: string[];
    }>;
  };
  return (data.models ?? [])
    // Only keep models that support generateContent — skips embedding
    // and vision-only models that would be useless as agent brains.
    .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
    .map((m) => {
      const id = m.name.replace(/^models\//, "");
      return {
        id,
        name: m.displayName || id,
        provider: "google" as const,
      };
    });
}

// ─── OpenAI ─────────────────────────────────────────────────────────────────
async function fetchOpenAIModels(apiKey: string): Promise<ProviderModel[]> {
  const res = await fetchWithTimeout("https://api.openai.com/v1/models", {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) {
    console.error("[fetch-models] openai", res.status, await safeText(res));
    return [];
  }
  const data = (await res.json()) as { data?: Array<{ id: string }> };
  return (data.data ?? [])
    // Filter to chat-capable families; audio/embedding/moderation models
    // are returned by the same endpoint but aren't useful as agent brains.
    .filter((m) => /^(gpt-|o\d|chatgpt-)/i.test(m.id))
    .map((m) => ({
      id: m.id,
      name: m.id,
      provider: "openai" as const,
    }));
}

// ─── Grok (xAI) ─────────────────────────────────────────────────────────────
async function fetchGrokModels(apiKey: string): Promise<ProviderModel[]> {
  const res = await fetchWithTimeout("https://api.x.ai/v1/models", {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) {
    console.error("[fetch-models] grok", res.status, await safeText(res));
    return [];
  }
  const data = (await res.json()) as { data?: Array<{ id: string }> };
  return (data.data ?? []).map((m) => ({
    id: m.id,
    name: m.id,
    provider: "grok" as const,
  }));
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Consume the error body safely — we don't want a read failure on
 * the error path to mask the original HTTP error in logs.
 */
async function safeText(res: Response): Promise<string> {
  try {
    return (await res.text()).slice(0, 200);
  } catch {
    return "<unreadable>";
  }
}
