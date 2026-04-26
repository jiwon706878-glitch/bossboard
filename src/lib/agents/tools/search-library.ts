/**
 * Search-result capping for the (planned) `search_library` MCP tool.
 *
 * The cap exists for cost + context-window safety: an unbounded grep can
 * dump megabytes of context into the agent's prompt, blowing through the
 * model's window and the user's BYOK budget. Top-5 / 2K-per-result /
 * 10K-total is a deliberately small budget — when truncated the agent is
 * told to ask for specific files.
 */

export const SEARCH_LIMITS = {
  MAX_RESULTS: 5,
  MAX_CHARS_PER_RESULT: 2000,
  MAX_TOTAL_CHARS: 10_000,
} as const;

export interface RawSearchHit {
  path: string;
  content: string;
  score: number;
}

export interface CappedSearchResult {
  path: string;
  snippet: string;
  score: number;
  truncated: boolean;
}

export interface CappedSearchResponse {
  results: CappedSearchResult[];
  totalMatches: number;
  truncated: boolean;
  /** Hint string the agent can append to its context. */
  noticeForAgent?: string;
}

/**
 * Cap a list of raw FTS hits down to fit the SEARCH_LIMITS budget. Keep
 * snippets centred around the first match of `query` when possible.
 */
export function capSearchResults(
  query: string,
  rawHits: RawSearchHit[],
): CappedSearchResponse {
  const top = rawHits.slice(0, SEARCH_LIMITS.MAX_RESULTS);
  const results: CappedSearchResult[] = [];
  let totalChars = 0;
  let anyTruncated = rawHits.length > SEARCH_LIMITS.MAX_RESULTS;

  for (const hit of top) {
    const remaining = SEARCH_LIMITS.MAX_TOTAL_CHARS - totalChars;
    if (remaining <= 100) break;

    const maxChars = Math.min(SEARCH_LIMITS.MAX_CHARS_PER_RESULT, remaining);
    const snippet = extractSnippet(hit.content, query, maxChars);
    const truncated = hit.content.length > snippet.length;
    if (truncated) anyTruncated = true;

    results.push({
      path: hit.path,
      snippet,
      score: hit.score,
      truncated,
    });
    totalChars += snippet.length;
  }

  const noticeForAgent = anyTruncated
    ? `[Note: Search results truncated to top ${SEARCH_LIMITS.MAX_RESULTS} files (${SEARCH_LIMITS.MAX_TOTAL_CHARS} chars total). ${rawHits.length} total matches. Ask for a specific file path if you need more.]`
    : undefined;

  return {
    results,
    totalMatches: rawHits.length,
    truncated: anyTruncated,
    noticeForAgent,
  };
}

function extractSnippet(content: string, query: string, maxChars: number): string {
  if (content.length <= maxChars) return content;

  const lower = content.toLowerCase();
  const queryLower = query.trim().toLowerCase();
  const idx = queryLower ? lower.indexOf(queryLower) : -1;

  if (idx === -1) {
    return content.slice(0, maxChars);
  }

  const window = Math.floor((maxChars - queryLower.length) / 2);
  const start = Math.max(0, idx - window);
  const end = Math.min(content.length, start + maxChars);
  let snippet = content.slice(start, end);
  if (start > 0) snippet = "…" + snippet;
  if (end < content.length) snippet = snippet + "…";
  return snippet;
}
