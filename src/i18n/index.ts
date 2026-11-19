/**
 * Storage Cleanup i18n entry point.
 *
 * The plugin detects the host language once on load; commands, ribbon and
 * notices are registered with that language. Switching the Obsidian language
 * requires a reload for command names and the ribbon tooltip to update.
 */
import { getLanguage } from "obsidian";
import { detectLanguageFrom, I18n as CoreI18n } from "./core";

export class I18n extends CoreI18n {
  /** Read the host UI language, falling back to vault config, browser, then English. */
  static detectLanguage(app?: unknown): string {
    const official = typeof getLanguage === "function" ? getLanguage() : "";
    return detectLanguageFrom(official, app);
  }
}

export { LOCALES, detectLanguageFrom, resolveLocale } from "./core";
export type { LocaleKey, LocaleMap, LocaleParams, LocaleStrings } from "./types";
