interface InteractionLog {
  agent: string;
  topic: string;
  timestamp: number;
}

const RECENT: InteractionLog[] = [];
const HARD_LIMIT = 5;
const TIME_WINDOW_MS = 5 * 60 * 1000;

/**
 * Records an interaction and returns true if it's allowed. Returns false when
 * the same (agent, topic) pair has fired ≥ HARD_LIMIT times in the last
 * TIME_WINDOW_MS — caller should stop the agent and surface a warning.
 */
export function recordInteraction(agent: string, topic: string): boolean {
  const now = Date.now();
  while (RECENT.length > 0 && now - RECENT[0].timestamp > TIME_WINDOW_MS) {
    RECENT.shift();
  }
  const sameCount = RECENT.filter((i) => i.agent === agent && i.topic === topic).length;
  if (sameCount >= HARD_LIMIT) {
    return false;
  }
  RECENT.push({ agent, topic, timestamp: now });
  return true;
}

/** Coarse fingerprint of a message — first 50 normalized chars. */
export function detectLoopHash(message: string): string {
  return message.toLowerCase().replace(/\s+/g, " ").trim().slice(0, 50);
}
