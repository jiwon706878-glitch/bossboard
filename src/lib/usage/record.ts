import { invoke } from "@tauri-apps/api/core";
import { isTauri } from "@/lib/tauri/fs";

interface UsageEntry {
  agent_name: string;
  provider: string;
  tokens_in: number;
  tokens_out: number;
}

/**
 * Best-effort token usage recorder. Writes to the local SQLite via the
 * Tauri `record_token_usage` command. Silent on failure — never bubble
 * up an error from telemetry into the agent's response path.
 *
 * Outside Tauri (e.g. dev preview in a browser) this is a no-op.
 */
export async function recordTokenUsage(entry: UsageEntry): Promise<void> {
  if (!isTauri()) return;
  if (!entry.tokens_in && !entry.tokens_out) return;
  try {
    await invoke("record_token_usage", { entry });
  } catch {
    /* swallow — telemetry is non-critical */
  }
}
