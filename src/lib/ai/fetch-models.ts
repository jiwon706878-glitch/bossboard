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
  /**
   * Unix ms timestamp of when the model was released, extracted from
   * each provider's /v1/models response. 0 if the provider's API
   * doesn't expose a timestamp (e.g., Google). The sort falls back
   * to a natural ID comparison in that case.
   */
  created_at: number;
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
  const data = (await res.json()) as {
    data?: Array<{ id: string; display_name?: string; created_at?: string }>;
  };
  return (data.data ?? []).map((m) => ({
    id: m.id,
    name: m.display_name || m.id,
    provider: "anthropic" as const,
    // Anthropic returns ISO 8601 in `created_at`.
    created_at: m.created_at ? new Date(m.created_at).getTime() : 0,
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
        // Google's API doesn't expose a timestamp; sortModels
        // falls back to natural ID ordering for these (so
        // "gemini-3-1-pro" sorts above "gemini-2-5-pro").
        created_at: 0,
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
  const data = (await res.json()) as {
    data?: Array<{ id: string; created?: number }>;
  };
  return (data.data ?? [])
    // Filter to chat-capable families; audio/embedding/moderation models
    // are returned by the same endpoint but aren't useful as agent brains.
    .filter((m) => /^(gpt-|o\d|chatgpt-)/i.test(m.id))
    .map((m) => ({
      id: m.id,
      name: m.id,
      provider: "openai" as const,
      // OpenAI returns Unix seconds in `created`.
      created_at: m.created ? m.created * 1000 : 0,
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
  const data = (await res.json()) as {
    data?: Array<{ id: string; created?: number }>;
  };
  return (data.data ?? []).map((m) => ({
    id: m.id,
    name: m.id,
    provider: "grok" as const,
    // xAI mirrors OpenAI's `created` Unix-seconds shape.
    created_at: m.created ? m.created * 1000 : 0,
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

/**
 * Parse a Claude model ID into family + version. Handles both the
 * post-2025 format (`claude-opus-4-5-20251101`) and the pre-2025
 * format (`claude-3-5-sonnet-20241022`) where family + version are
 * swapped. Returns null if the ID doesn't match either shape so the
 * caller can fall back to the default sort.
 *
 * We need this because:
 *   (a) Anthropic's API says `created_at` may be set to an epoch
 *       value for models with an unknown release date, which makes
 *       the timestamp path unreliable for older models.
 *   (b) A natural string comparison of `claude-opus-4-6` vs
 *       `claude-sonnet-4-6` puts sonnet first because 's' > 'o'.
 *       Family priority (opus > sonnet > haiku) is a real product
 *       requirement that natural sort can never express.
 */
interface ClaudeParsed {
  family: "opus" | "sonnet" | "haiku";
  major: number;
  minor: number;
}

const FAMILY_RANK: Record<ClaudeParsed["family"], number> = {
  opus: 3,
  sonnet: 2,
  haiku: 1,
};

function parseClaudeModel(id: string): ClaudeParsed | null {
  // Strip trailing date suffix (-YYYYMMDD) before parsing so
  // "claude-opus-4-20251101" doesn't accidentally treat the date
  // as a minor version.
  const stripped = id.replace(/-\d{8}$/, "");

  // New format: claude-opus-4-6 (family-major-minor)
  let m = stripped.match(/^claude-(opus|sonnet|haiku)-(\d+)-(\d+)$/i);
  if (m) {
    return {
      family: m[1].toLowerCase() as ClaudeParsed["family"],
      major: parseInt(m[2], 10),
      minor: parseInt(m[3], 10),
    };
  }
  // Bare major: claude-opus-4 (no minor version)
  m = stripped.match(/^claude-(opus|sonnet|haiku)-(\d+)$/i);
  if (m) {
    return {
      family: m[1].toLowerCase() as ClaudeParsed["family"],
      major: parseInt(m[2], 10),
      minor: 0,
    };
  }
  // Legacy format: claude-3-5-sonnet-20241022 or claude-3-5-sonnet
  m = stripped.match(/^claude-(\d+)-(\d+)-(opus|sonnet|haiku)$/i);
  if (m) {
    return {
      family: m[3].toLowerCase() as ClaudeParsed["family"],
      major: parseInt(m[1], 10),
      minor: parseInt(m[2], 10),
    };
  }
  // Legacy bare: claude-3-sonnet
  m = stripped.match(/^claude-(\d+)-(opus|sonnet|haiku)$/i);
  if (m) {
    return {
      family: m[2].toLowerCase() as ClaudeParsed["family"],
      major: parseInt(m[1], 10),
      minor: 0,
    };
  }
  return null;
}

/**
 * "Latest per family" — picks one representative model per family
 * (opus / sonnet / haiku / gemini-pro / gemini-flash / gpt-N /
 * o-series / grok) so the dropdown can render a tight ⭐ Latest
 * section above the full catalog. Covers ~99% of agent creation
 * picks without making the user scroll a long list.
 *
 * Family classification (`getFamilyKey`) is intentionally loose:
 *   - Anthropic: parseClaudeModel → "anthropic:opus|sonnet|haiku"
 *   - Google: substring match on "flash" / "pro"
 *   - OpenAI: o-series (`/^o\d/`) or "gpt-N" (major version only)
 *   - Grok: single bucket "grok:grok"
 *   - anything that doesn't match → null (skipped from Latest)
 *
 * Within a family, the "best" representative is whichever model
 * sorts earliest under `compareForLatest` — Anthropic uses the
 * parsed major.minor (so opus 4.6 beats opus 4.5 even when both
 * carry an epoch timestamp), other providers fall back to
 * created_at desc, and the natural ID sort is the last resort.
 */

function getFamilyKey(m: ProviderModel): string | null {
  if (m.provider === "anthropic") {
    const parsed = parseClaudeModel(m.id);
    return parsed ? `anthropic:${parsed.family}` : null;
  }
  if (m.provider === "google") {
    const id = m.id.toLowerCase();
    // Order matters: a model named "gemini-flash-pro" (hypothetical)
    // should land under flash, not pro. Flash check first.
    if (id.includes("flash")) return "google:flash";
    if (id.includes("pro")) return "google:pro";
    return null;
  }
  if (m.provider === "openai") {
    const id = m.id.toLowerCase();
    // o-series reasoning models (o1, o2, o3-mini, ...)
    if (/^o\d/.test(id)) return "openai:o-series";
    // GPT-N family — grouped by major version only, so gpt-4o,
    // gpt-4.1, gpt-4-turbo all share family "openai:gpt-4" and
    // compareForLatest picks whichever has the newer timestamp.
    const gptMatch = id.match(/^gpt-(\d+)/);
    if (gptMatch) return `openai:gpt-${gptMatch[1]}`;
    return null;
  }
  if (m.provider === "grok") {
    return "grok:grok";
  }
  return null;
}

/**
 * Comparator used INSIDE a family to pick the latest representative.
 * Returns negative when `a` should win.
 */
function compareForLatest(a: ProviderModel, b: ProviderModel): number {
  // Anthropic: prefer parsed version desc — beats epoch timestamps.
  if (a.provider === "anthropic" && b.provider === "anthropic") {
    const ap = parseClaudeModel(a.id);
    const bp = parseClaudeModel(b.id);
    if (ap && bp) {
      if (ap.major !== bp.major) return bp.major - ap.major;
      if (ap.minor !== bp.minor) return bp.minor - ap.minor;
    }
  }
  // Other providers: timestamp desc when both populated.
  if (a.created_at && b.created_at && a.created_at !== b.created_at) {
    return b.created_at - a.created_at;
  }
  // Fallback: locale-numeric ID desc.
  return b.id.localeCompare(a.id, undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

/**
 * Returns one ProviderModel per family in display order. Unknown
 * family keys are appended at the end (sorted within themselves
 * by ID desc) so a hypothetical future "openai:gpt-6" doesn't get
 * silently dropped — it just lands below the curated order.
 */
export function getLatestPerFamily(models: ProviderModel[]): ProviderModel[] {
  const byFamily = new Map<string, ProviderModel>();

  for (const m of models) {
    const key = getFamilyKey(m);
    if (!key) continue;
    const existing = byFamily.get(key);
    if (!existing || compareForLatest(m, existing) < 0) {
      byFamily.set(key, m);
    }
  }

  // Curated display order. New families released after this list
  // was last updated will appear at the end via the unknown-keys
  // append loop below — they show up in Latest immediately, just
  // not in the "best" position until someone reorders this list.
  const order = [
    "anthropic:opus",
    "anthropic:sonnet",
    "anthropic:haiku",
    "google:pro",
    "google:flash",
    "openai:gpt-5",
    "openai:o-series",
    "openai:gpt-4",
    "grok:grok",
  ];

  const result: ProviderModel[] = [];
  for (const key of order) {
    const m = byFamily.get(key);
    if (m) result.push(m);
  }

  // Append unknown family keys at the end, sorted by key desc so a
  // future "openai:gpt-6" lands above an "openai:gpt-3" that we've
  // also forgotten to put in the order list.
  const unknown: Array<[string, ProviderModel]> = [];
  for (const [key, m] of byFamily) {
    if (!order.includes(key)) unknown.push([key, m]);
  }
  unknown.sort((a, b) => b[0].localeCompare(a[0]));
  for (const [, m] of unknown) result.push(m);

  return result;
}

/**
 * Sort a heterogeneous model list by provider, then newest-first
 * within provider.
 *
 * Ordering rules (in priority order):
 *   1. Group by provider so dropdowns can render <optgroup>s.
 *   2. For Claude: if BOTH IDs parse as a Claude model, sort by
 *      family priority (opus > sonnet > haiku), then major version
 *      desc, then minor version desc. This rule beats the timestamp
 *      path because Anthropic sometimes stamps older models with an
 *      epoch `created_at` and we don't want that to scramble order.
 *   3. For OpenAI/Grok: `created_at` (Unix ms) desc when both rows
 *      have a non-zero value. This is the main path — when a new
 *      model ships, its fresh timestamp lands it at the top.
 *   4. Fallback: locale-aware numeric ID descending, so
 *      "gemini-3-1-pro" > "gemini-2-5-pro" and the sort never
 *      crashes on weird shapes.
 */
export function sortModels(models: ProviderModel[]): ProviderModel[] {
  return [...models].sort((a, b) => {
    if (a.provider !== b.provider) {
      return a.provider.localeCompare(b.provider);
    }

    // Anthropic-specific: family priority from parsed ID.
    if (a.provider === "anthropic") {
      const pa = parseClaudeModel(a.id);
      const pb = parseClaudeModel(b.id);
      if (pa && pb) {
        const familyDiff = FAMILY_RANK[pb.family] - FAMILY_RANK[pa.family];
        if (familyDiff !== 0) return familyDiff;
        if (pa.major !== pb.major) return pb.major - pa.major;
        if (pa.minor !== pb.minor) return pb.minor - pa.minor;
        // Same family + version — fall through to ID sort for the
        // date suffix (e.g. -20251101 > -20250701).
      }
      // If only one parses, put the parsed one first; the unparsed
      // one is probably an experimental or test alias.
      if (pa && !pb) return -1;
      if (!pa && pb) return 1;
    }

    // Timestamp path (primary for OpenAI / Grok).
    if (a.created_at && b.created_at && a.created_at !== b.created_at) {
      return b.created_at - a.created_at;
    }

    // Fallback: locale-aware numeric ID descending.
    return b.id.localeCompare(a.id, undefined, {
      numeric: true,
      sensitivity: "base",
    });
  });
}
