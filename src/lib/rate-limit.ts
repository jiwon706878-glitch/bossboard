// Simple in-memory per-key rate limiter
const limitMap = new Map<string, { count: number; resetAt: number }>();

/**
 * Check and increment rate limit.
 * Returns true if within limit, false if exceeded.
 */
export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = limitMap.get(key);
  if (!entry || now > entry.resetAt) {
    limitMap.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}
