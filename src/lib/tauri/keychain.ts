import { invoke } from "@tauri-apps/api/core";
import { isTauri } from "@/lib/tauri/fs";

export async function setKey(key: string, value: string): Promise<void> {
  if (!isTauri()) {
    localStorage.setItem(`bb_${key}`, value);
    return;
  }
  return invoke("keychain_set", { key, value });
}

export async function getKey(key: string): Promise<string | null> {
  if (!isTauri()) {
    return localStorage.getItem(`bb_${key}`);
  }
  return invoke("keychain_get", { key });
}

export async function deleteKey(key: string): Promise<void> {
  if (!isTauri()) {
    localStorage.removeItem(`bb_${key}`);
    return;
  }
  return invoke("keychain_delete", { key });
}

const PROVIDERS = ["google", "anthropic", "openai", "grok"] as const;
type Provider = (typeof PROVIDERS)[number];

function provKey(p: Provider) {
  return `api_key_${p}`;
}

async function migrateOne(p: Provider): Promise<string | null> {
  const direct = await getKey(provKey(p));
  if (direct) return direct;
  const legacy = typeof localStorage !== "undefined"
    ? localStorage.getItem(`bb_api_key_${p}`)
    : null;
  if (legacy) {
    try {
      await setKey(provKey(p), legacy);
      localStorage.removeItem(`bb_api_key_${p}`);
    } catch {
      /* fall back to returning the legacy value */
    }
    return legacy;
  }
  return null;
}

export const ApiKeys = {
  google: () => migrateOne("google"),
  anthropic: () => migrateOne("anthropic"),
  openai: () => migrateOne("openai"),
  grok: () => migrateOne("grok"),

  setGoogle: (k: string) => setKey(provKey("google"), k),
  setAnthropic: (k: string) => setKey(provKey("anthropic"), k),
  setOpenai: (k: string) => setKey(provKey("openai"), k),
  setGrok: (k: string) => setKey(provKey("grok"), k),

  deleteAll: async () => {
    for (const p of PROVIDERS) await deleteKey(provKey(p));
  },
};
