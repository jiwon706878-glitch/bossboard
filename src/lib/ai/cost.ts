/** Rough token estimate. CJK averages ~2 chars/token, Latin ~4. */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  const cjkMatches = text.match(/[一-鿿぀-ゟ゠-ヿ가-힯]/g);
  const cjk = cjkMatches ? cjkMatches.length : 0;
  const other = text.length - cjk;
  return Math.ceil(cjk / 2 + other / 4);
}

type Provider = "google" | "anthropic" | "openai";

const RATES: Record<Provider, { input: number; output: number }> = {
  // USD per 1M tokens. Sourced from public pricing pages April 2026 — verify
  // against your provider's current rates if you wire billing logic.
  google: { input: 0.3, output: 2.5 },
  anthropic: { input: 3, output: 15 },
  openai: { input: 2.5, output: 10 },
};

/** Symmetric estimate (assumes input ≈ output for translation/chat). */
export function estimateCostUsd(tokens: number, provider: Provider): number {
  const rate = RATES[provider] ?? RATES.google;
  return (tokens / 1_000_000) * (rate.input + rate.output);
}

export function formatCost(usd: number): string {
  if (usd < 0.01) return `<$0.01`;
  return `$${usd.toFixed(usd < 1 ? 3 : 2)}`;
}
