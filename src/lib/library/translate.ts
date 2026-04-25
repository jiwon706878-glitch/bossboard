export const SUPPORTED_LANGUAGES = {
  ko: "Korean (한국어)",
  ja: "Japanese (日本語)",
  zh: "Chinese (中文)",
  es: "Spanish (Español)",
  de: "German (Deutsch)",
  fr: "French (Français)",
} as const;

export type LangCode = keyof typeof SUPPORTED_LANGUAGES;
export type TranslationProvider = "google" | "anthropic";

export async function translateText(
  text: string,
  targetLang: LangCode,
  provider: TranslationProvider = "google",
): Promise<string> {
  const apiKey = localStorage.getItem(`bb_api_key_${provider}`) || "";
  if (!apiKey) throw new Error("API key required for translation. Add one in Settings.");

  const langName = SUPPORTED_LANGUAGES[targetLang];
  const prompt = `Translate the following markdown to ${langName}. Preserve all formatting (headings, lists, code blocks, links). Only output the translated markdown, nothing else.\n\n${text}`;

  if (provider === "google") {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
        }),
      },
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message || "Translation failed");
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || "Translation failed");
  return data.content?.[0]?.text || "";
}
