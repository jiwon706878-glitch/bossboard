import { getKey, setKey, deleteKey } from "@/lib/tauri/keychain";

export type AIProvider =
  | "google"
  | "anthropic"
  | "openai"
  | "xai"
  | "local"
  | "custom";

export interface APIKey {
  id: string;
  provider: AIProvider;
  name: string;
  key: string;
  notes?: string;
  createdAt: string;
  lastUsedAt?: string;
}

export const PROVIDERS: Record<
  AIProvider,
  { label: string; icon: string; keyPrefix: string; docsUrl: string }
> = {
  google: {
    label: "Google (Gemini)",
    icon: "G",
    keyPrefix: "AIza",
    docsUrl: "https://aistudio.google.com/app/apikey",
  },
  anthropic: {
    label: "Anthropic (Claude)",
    icon: "A",
    keyPrefix: "sk-ant-",
    docsUrl: "https://console.anthropic.com/account/keys",
  },
  openai: {
    label: "OpenAI (GPT)",
    icon: "O",
    keyPrefix: "sk-",
    docsUrl: "https://platform.openai.com/api-keys",
  },
  xai: {
    label: "xAI (Grok)",
    icon: "X",
    keyPrefix: "xai-",
    docsUrl: "https://x.ai/api",
  },
  local: {
    label: "Local (Ollama)",
    icon: "L",
    keyPrefix: "",
    docsUrl: "https://ollama.ai",
  },
  custom: {
    label: "Custom",
    icon: "·",
    keyPrefix: "",
    docsUrl: "",
  },
};

const STORE_KEY = "api_keys_v2";

export async function loadKeys(): Promise<APIKey[]> {
  try {
    const raw = await getKey(STORE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as APIKey[]) : [];
  } catch {
    return [];
  }
}

export async function saveKeys(keys: APIKey[]): Promise<void> {
  await setKey(STORE_KEY, JSON.stringify(keys));
}

export async function addKey(key: APIKey): Promise<APIKey[]> {
  const keys = await loadKeys();
  const next = [...keys.filter((k) => k.id !== key.id), key];
  await saveKeys(next);
  return next;
}

export async function deleteKeyById(id: string): Promise<APIKey[]> {
  const keys = await loadKeys();
  const next = keys.filter((k) => k.id !== id);
  await saveKeys(next);
  return next;
}

export async function markKeyUsed(id: string): Promise<void> {
  const keys = await loadKeys();
  const idx = keys.findIndex((k) => k.id === id);
  if (idx === -1) return;
  keys[idx] = { ...keys[idx], lastUsedAt: new Date().toISOString() };
  await saveKeys(keys);
}

/**
 * Returns the key the agent should use for a provider. If `keyId` is set,
 * uses that exact entry; otherwise returns the first matching entry. Throws
 * a friendly error when no key exists — surfaces are responsible for
 * routing the user to Settings.
 */
export async function resolveKey(
  provider: AIProvider,
  keyId?: string,
): Promise<APIKey> {
  const keys = await loadKeys();
  const matching = keys.filter((k) => k.provider === provider);
  if (matching.length === 0) {
    throw new Error(
      `No ${PROVIDERS[provider].label} API key configured. Add one in Settings → AI providers.`,
    );
  }
  const picked = keyId
    ? matching.find((k) => k.id === keyId)
    : matching[0];
  if (!picked) {
    throw new Error(
      `Specified ${PROVIDERS[provider].label} key not found. Pick a different key in Settings.`,
    );
  }
  return picked;
}

const LEGACY_SLUGS: Array<[string, AIProvider]> = [
  ["api_key_google", "google"],
  ["api_key_anthropic", "anthropic"],
  ["api_key_openai", "openai"],
  ["api_key_grok", "xai"],
];

/**
 * One-time migration from the per-provider single-key format
 * (`api_key_google`, etc.) to the new multi-key list. Idempotent: if a v2
 * list already exists, it is left alone. Successfully migrated legacy
 * entries are deleted from the keychain so the user only sees the new UI.
 */
export async function migrateOldKeys(): Promise<{ migrated: number }> {
  const existing = await loadKeys();
  if (existing.length > 0) return { migrated: 0 };

  const migrated: APIKey[] = [];
  for (const [slug, provider] of LEGACY_SLUGS) {
    const value = await getKey(slug).catch(() => null);
    if (!value) continue;
    migrated.push({
      id: crypto.randomUUID(),
      provider,
      name: "Default",
      key: value,
      createdAt: new Date().toISOString(),
    });
  }

  if (migrated.length === 0) return { migrated: 0 };

  await saveKeys(migrated);
  for (const [slug] of LEGACY_SLUGS) {
    await deleteKey(slug).catch(() => {});
  }
  return { migrated: migrated.length };
}
