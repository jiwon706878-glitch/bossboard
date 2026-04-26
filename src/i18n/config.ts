/**
 * i18n configuration. Beta ships English only — the locale routing
 * (`/[locale]/desktop/...`) migration is deferred (see LAUNCH-CHECKLIST).
 *
 * Community translations land in /settings/translations and are stored
 * locally per-workspace. When a target locale graduates from FUTURE to
 * SUPPORTED, the strings ship in `messages/{locale}.json` and the route
 * tree gets the locale prefix.
 */

export const SUPPORTED_LOCALES = ["en"] as const;

export const FUTURE_LOCALES = [
  "ko",
  "ja",
  "zh-CN",
  "es",
  "pt-BR",
  "de",
  "fr",
  "ru",
  "hi",
] as const;

export const ALL_LOCALES = [
  ...SUPPORTED_LOCALES,
  ...FUTURE_LOCALES,
] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
export type FutureLocale = (typeof FUTURE_LOCALES)[number];
export type Locale = (typeof ALL_LOCALES)[number];

export const DEFAULT_LOCALE: SupportedLocale = "en";

export const LOCALE_NAMES: Record<Locale, string> = {
  en: "English",
  ko: "한국어",
  ja: "日本語",
  "zh-CN": "简体中文",
  es: "Español",
  "pt-BR": "Português (Brasil)",
  de: "Deutsch",
  fr: "Français",
  ru: "Русский",
  hi: "हिन्दी",
};

/** Beta status per locale — drives the badge in the language picker. */
export const LOCALE_STATUS: Record<Locale, "stable" | "beta" | "coming-soon"> = {
  en: "stable",
  ko: "coming-soon",
  ja: "coming-soon",
  "zh-CN": "coming-soon",
  es: "coming-soon",
  "pt-BR": "coming-soon",
  de: "coming-soon",
  fr: "coming-soon",
  ru: "coming-soon",
  hi: "coming-soon",
};
