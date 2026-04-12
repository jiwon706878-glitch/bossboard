import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  fetchModelsForProvider,
  sortModels,
  getLatestPerFamily,
  type ProviderId,
  type ProviderModel,
} from "@/lib/ai/fetch-models";

/**
 * GET  /api/ai/available-models — returns the model lists for every
 *                                  AI provider key the caller has
 *                                  registered in settings.
 * POST /api/ai/available-models — force-refreshes the caller's cache,
 *                                  for when they've just added a key
 *                                  or published a new model.
 *
 * Only the four known AI providers are ever queried — a `custom_webhook`
 * key or a future Gmail / Slack / GitHub integration key will never be
 * sent to a model endpoint because it can't match the allowlist.
 *
 * Caching: a Node-process Map with a 24h TTL per user. On Vercel each
 * serverless instance has its own cache; the worst case is a few
 * duplicate provider calls across cold starts, which is acceptable
 * given how cheap /v1/models endpoints are.
 */

const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Only these keys in profiles.external_api_keys trigger a model fetch.
// Any other key (custom_webhook, future Gmail/Slack tokens, ...) is
// silently ignored — it would never pass this allowlist even if
// external_api_keys grows into a shared store for non-AI integrations.
const AI_PROVIDER_IDS = ["anthropic", "google", "openai", "grok"] as const;

interface CacheEntry {
  /** One model per family for the ⭐ Latest dropdown section. */
  latest: ProviderModel[];
  /** Full sorted catalog for the 📦 All Models section. */
  all: ProviderModel[];
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Cache hit — serve it and short-circuit the provider round-trips.
  // Defensive: an entry written by an older deploy may not carry the
  // `latest` / `all` fields. Treat any such entry as a miss so we
  // refetch + re-shape rather than returning undefined to the client.
  const hit = cache.get(user.id);
  if (
    hit &&
    hit.expiresAt > Date.now() &&
    Array.isArray(hit.latest) &&
    Array.isArray(hit.all)
  ) {
    return NextResponse.json({
      latest: hit.latest,
      all: hit.all,
      models: hit.all, // legacy alias for any pre-Latest caller
      cached: true,
    });
  }

  // Read the user's registered API keys
  const { data: profile } = await supabase
    .from("profiles")
    .select("external_api_keys")
    .eq("id", user.id)
    .maybeSingle();

  const keys = (profile?.external_api_keys ?? {}) as Record<
    string,
    string | { key?: string } | undefined
  >;

  const allModels: ProviderModel[] = [];

  // Fetch from every registered AI provider in parallel. Failures
  // from one provider don't block the others — fetchModelsForProvider
  // returns [] on any error.
  const fetches = AI_PROVIDER_IDS.map(async (providerId) => {
    const raw = keys[providerId];
    // Support both the plain-string shape (current ExternalApiKeysSection
    // writes a string) and a potential future {key: "..."} object shape
    // that would accommodate additional metadata without a migration.
    const apiKey =
      typeof raw === "string"
        ? raw
        : raw && typeof raw === "object" && typeof raw.key === "string"
          ? raw.key
          : null;
    if (!apiKey) return [];
    return fetchModelsForProvider(providerId as ProviderId, apiKey);
  });

  const results = await Promise.all(fetches);
  for (const models of results) {
    allModels.push(...models);
  }

  // Sort once on the way into the cache so every downstream consumer
  // gets the same order without re-sorting. Group by provider, then
  // Claude family priority / API timestamps / natural ID fallback —
  // see sortModels() docs.
  const sorted = sortModels(allModels);

  // Pick one representative per family for the ⭐ Latest section.
  // Computed against the unsorted `allModels` because the family
  // selection algorithm doesn't depend on sort order.
  const latest = getLatestPerFamily(allModels);

  // Debug: one-shot structured log so Jay can verify ordering in
  // Vercel logs. `latest` count makes it obvious whether family
  // selection is producing rows. Safe to leave in production — no
  // key material is logged, just ids + timestamps.
  const debugSummary = sorted.slice(0, 20).map((m) => ({
    provider: m.provider,
    id: m.id,
    created_at: m.created_at,
    created_at_iso: m.created_at
      ? new Date(m.created_at).toISOString()
      : null,
  }));
  console.log(
    "[available-models] user=%s total=%d latest=%d sample=%s",
    user.id,
    sorted.length,
    latest.length,
    JSON.stringify(debugSummary)
  );

  cache.set(user.id, {
    latest,
    all: sorted,
    expiresAt: Date.now() + TTL_MS,
  });

  return NextResponse.json({
    latest,
    all: sorted,
    models: sorted, // legacy alias for any pre-Latest caller
    cached: false,
  });
}

/**
 * POST — force-refresh. Busts the cache for the calling user so the
 * next GET re-fetches from every provider. The settings page should
 * call this after a successful key save so the user doesn't have to
 * wait 24 hours to see their new models.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  cache.delete(user.id);
  return NextResponse.json({ success: true });
}
