/**
 * BYOK key-leak guard.
 *
 * Two surfaces:
 *   1. assertNoKeysInPrompt(prompt): runs at every system-prompt build.
 *      If a known key pattern is found, the build is aborted immediately
 *      so the call to the model never ships the key over the wire.
 *   2. sanitizeAgentResponse(text): runs on every model response before it
 *      lands in DM, Board, Library — defends against the model echoing a
 *      key it hallucinated or pulled from a system message it shouldn't
 *      have seen.
 */

const KEY_PATTERNS: RegExp[] = [
  /sk-ant-[a-zA-Z0-9_-]{20,}/g, // Anthropic
  /sk-[a-zA-Z0-9]{32,}/g,        // OpenAI (avoid matching short generic prefixes)
  /AIza[a-zA-Z0-9_-]{35}/g,      // Google
  /xai-[a-zA-Z0-9]{20,}/g,       // xAI
  /Bearer\s+[a-zA-Z0-9._-]{32,}/g, // Generic Bearer
];

export class KeyLeakError extends Error {
  constructor(public matchedPattern: string) {
    super(`KeyLeakGuard: API key pattern detected in system prompt. Build aborted.`);
    this.name = "KeyLeakError";
  }
}

/**
 * Throws KeyLeakError if any known API key pattern matches the prompt.
 * Call this immediately before sending the system+user payload to the model.
 */
export function assertNoKeysInPrompt(prompt: string): void {
  for (const pattern of KEY_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(prompt)) {
      throw new KeyLeakError(pattern.source);
    }
  }
}

/**
 * Replaces any matched key pattern with [REDACTED]. Use on every model
 * response before showing it to the user or persisting it.
 */
export function sanitizeAgentResponse(response: string): string {
  let cleaned = response;
  for (const pattern of KEY_PATTERNS) {
    pattern.lastIndex = 0;
    cleaned = cleaned.replace(pattern, "[REDACTED]");
  }
  return cleaned;
}
