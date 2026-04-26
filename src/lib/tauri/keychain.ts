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
