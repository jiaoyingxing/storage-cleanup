/**
 * Storage Cleanup i18n core.
 *
 * This module is host-agnostic so unit tests can load it without the Obsidian
 * runtime. `src/i18n/index.ts` adds host language detection on top.
 */
import type { LocaleKey, LocaleMap, LocaleParams, LocaleStrings } from "./types";
import en from "./en";
import zhCN from "./zh-cn";

/** All available locales. */
export const LOCALES: LocaleMap = {
  en,
  "zh-cn": zhCN
};

/**
 * Map a raw language tag to a supported locale.
 * `zh`, `zh-CN`, `zh-TW` and other `zh-*` tags resolve to Simplified Chinese;
 * every other tag resolves to English.
 */
export function resolveLocale(rawLang: string): LocaleKey {
  const lower = rawLang.trim().toLowerCase();
  if (lower === "zh" || lower.startsWith("zh-") || lower.startsWith("zh_")) {
    return "zh-cn";
  }
  return "en";
}

/**
 * Resolve the host language with the documented fallback chain:
 * official `getLanguage()` → `app.vault.getConfig("language")` →
 * `navigator.language` → `"en"`.
 */
export function detectLanguageFrom(
  officialLanguage: string,
  app?: unknown
): string {
  if (officialLanguage) return officialLanguage;
  const configured = (
    app as { vault?: { getConfig?: (key: string) => unknown } } | undefined
  )?.vault?.getConfig?.("language");
  if (typeof configured === "string" && configured) return configured;
  if (typeof navigator !== "undefined" && navigator.language) {
    return navigator.language;
  }
  return "en";
}

export class I18n {
  /** Resolved locale key ("en" | "zh-cn"). */
  readonly language: LocaleKey;
  private readonly locale: LocaleStrings;

  constructor(language?: string) {
    const key = resolveLocale(language ?? "en");
    this.language = key;
    this.locale = LOCALES[key];
  }

  /**
   * Translate a key with optional `{param}` interpolation.
   * When `params.count` is a number, `${key}.one` / `${key}.other` is preferred;
   * missing variants fall back to the base key, then to English, then to the key.
   */
  t(key: string, params?: LocaleParams): string {
    let template: string | undefined;
    if (params && typeof params.count === "number") {
      const variant = `${key}.${params.count === 1 ? "one" : "other"}`;
      template =
        this.localeValue(variant) ??
        this.localeValue(key) ??
        this.englishValue(variant) ??
        this.englishValue(key);
    } else {
      template = this.localeValue(key) ?? this.englishValue(key);
    }
    template ??= key;

    if (!params) return template;
    for (const [name, value] of Object.entries(params)) {
      template = template.split(`{${name}}`).join(this.formatValue(value));
    }
    return template;
  }

  private formatValue(value: string | number): string {
    if (typeof value !== "number") return value;
    const localeTag = this.language === "zh-cn" ? "zh-CN" : "en-US";
    return new Intl.NumberFormat(localeTag).format(value);
  }

  private localeValue(key: string): string | undefined {
    return (this.locale as unknown as Record<string, string>)[key];
  }

  private englishValue(key: string): string | undefined {
    return (en as unknown as Record<string, string>)[key];
  }
}
