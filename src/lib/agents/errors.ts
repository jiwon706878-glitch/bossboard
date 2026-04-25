/**
 * Map a raw provider error into a human-readable Error. Inputs come from
 * Vercel AI SDK calls (which surface upstream HTTP status as `statusCode`),
 * raw fetch responses, or generic JS errors.
 */
export function wrapAIError(provider: string, error: unknown): Error {
  const e = error as { statusCode?: number; status?: number; message?: string };
  const status = e?.statusCode ?? e?.status;
  const message = e?.message ?? String(error);

  if (status === 401 || /unauthor|invalid[ _-]?api[ _-]?key/i.test(message)) {
    return new Error(`${provider} API key invalid. Check Settings → AI providers.`);
  }
  if (status === 429 || /rate[ _-]?limit/i.test(message)) {
    return new Error(`${provider} rate limit hit. Wait a moment or switch providers.`);
  }
  if (status === 400 && /context|too long|maximum/i.test(message)) {
    return new Error(
      `Context too long for ${provider}. Compress the conversation or use a model with a larger context window.`,
    );
  }
  if (status === 402 || /quota|insufficient|billing/i.test(message)) {
    return new Error(`${provider} quota or billing issue. Top up at the provider's dashboard.`);
  }
  if (status === 500 || status === 502 || status === 503 || status === 504) {
    return new Error(`${provider} server error (${status}). Try again or switch providers.`);
  }
  return new Error(`${provider} error: ${message}`);
}

/** Reject if `fn` doesn't resolve in `timeoutMs`. */
export async function callWithTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  errorMsg: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<T>((_, reject) => {
    timer = setTimeout(() => reject(new Error(errorMsg)), timeoutMs);
  });
  try {
    return await Promise.race([fn(), timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
