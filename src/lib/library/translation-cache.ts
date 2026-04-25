import { translateText } from "./translate";
import type { LangCode, TranslationProvider } from "./translate";

/**
 * In-memory translation cache, keyed per-paragraph. Persistent disk cache
 * (./bb/translation-cache.json) is post-launch — see LAUNCH-CHECKLIST.
 */
const cache = new Map<string, string>();

function hashKey(text: string): string {
  let h = 0;
  for (let i = 0; i < text.length; i++) {
    h = ((h << 5) - h + text.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}

export async function translateWithCache(
  content: string,
  targetLang: LangCode,
  provider: TranslationProvider = "google",
): Promise<string> {
  const paragraphs = content.split(/\n\n+/);
  const out: string[] = [];
  for (const paragraph of paragraphs) {
    if (paragraph.trim().length < 10) {
      out.push(paragraph);
      continue;
    }
    const key = `${hashKey(paragraph)}:${targetLang}:${provider}`;
    const cached = cache.get(key);
    if (cached) {
      out.push(cached);
      continue;
    }
    const translated = await translateText(paragraph, targetLang, provider);
    cache.set(key, translated);
    out.push(translated);
  }
  return out.join("\n\n");
}
