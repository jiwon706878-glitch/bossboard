import type { JSONContent } from "@tiptap/react";
import { indexSop } from "./auto-index";

/**
 * In-memory debounced indexing queue. Five minutes after a page
 * stops being saved, we run the Gemini indexer once. Rapid-fire
 * saves within the window collapse into a single call, which is
 * both cheaper and produces metadata that reflects the final state.
 *
 * Limitations:
 *   - The queue lives in the Node process memory, so on Vercel each
 *     cold start starts empty. That's fine because the DB-side
 *     trigger sets ai_index_pending=true on every content change;
 *     a fallback cron can sweep pending rows and call indexSop()
 *     directly if the in-memory timer never fires.
 *   - Multiple server instances each have their own queue, so the
 *     debounce window is per-instance. In practice the routing is
 *     sticky enough for this to be acceptable for the Day 2
 *     foundation — the worst case is "a few extra Gemini calls".
 */

type QueueEntry = {
  timer: NodeJS.Timeout;
  content: JSONContent | null;
  title: string;
};

const pendingIndexes = new Map<string, QueueEntry>();
const DEBOUNCE_MS = 5 * 60 * 1000; // 5 minutes

export function scheduleIndexing(
  sopId: string,
  content: JSONContent | null,
  title: string
): void {
  const existing = pendingIndexes.get(sopId);
  if (existing) clearTimeout(existing.timer);

  // The callback reads the latest snapshot from the Map, not its
  // closure — this makes "latest write wins" a structural guarantee
  // rather than a side-effect of closure identity. Matters if the
  // Map is ever mutated without recreating the timer (e.g., a future
  // refresh-in-place refactor).
  const timer = setTimeout(async () => {
    const entry = pendingIndexes.get(sopId);
    pendingIndexes.delete(sopId);
    if (!entry) return;
    try {
      await indexSop(sopId, entry.content, entry.title);
    } catch (error) {
      console.error("[index-queue] indexSop threw", sopId, error);
    }
  }, DEBOUNCE_MS);

  pendingIndexes.set(sopId, { timer, content, title });
}

export function cancelIndexing(sopId: string): void {
  const existing = pendingIndexes.get(sopId);
  if (existing) {
    clearTimeout(existing.timer);
    pendingIndexes.delete(sopId);
  }
}

/** Test/debug helper — number of currently-queued indexing jobs. */
export function pendingIndexCount(): number {
  return pendingIndexes.size;
}
