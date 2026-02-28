import { computed, readonly } from "vue";
import { createI18n } from "vue-i18n";
import { messages } from "./messages";

export const APP_LOCALES = ["zh-CN", "en-US"] as const;
export type AppLocale = (typeof APP_LOCALES)[number];
export const DEFAULT_LOCALE: AppLocale = "zh-CN";

const localeAliasMap: Record<string, AppLocale> = {
  zh: "zh-CN",
  "zh-cn": "zh-CN",
  "zh-hans": "zh-CN",
  en: "en-US",
  "en-us": "en-US"
};

export function normalizeAppLocale(value: unknown): AppLocale {
  if (typeof value !== "string") {
    return DEFAULT_LOCALE;
  }
  const normalized = value.trim().toLowerCase();
  return localeAliasMap[normalized] ?? DEFAULT_LOCALE;
}

export const i18n = createI18n({
  legacy: false,
  locale: DEFAULT_LOCALE,
  fallbackLocale: DEFAULT_LOCALE,
  missingWarn: false,
  fallbackWarn: false,
  messages
});

function readLocale(): AppLocale {
  return normalizeAppLocale(i18n.global.locale.value);
}

export const currentLocale = computed<AppLocale>(() => readLocale());

export function getCurrentLocale(): AppLocale {
  return readLocale();
}

export function setAppLocale(value: unknown): AppLocale {
  const normalized = normalizeAppLocale(value);
  i18n.global.locale.value = normalized;
  return normalized;
}

export function t(key: string, params?: Record<string, string | number>): string {
  const translated = i18n.global.t(key, params ?? {});
  return typeof translated === "string" ? translated : String(translated);
}

export function useI18nText() {
  return {
    locale: readonly(currentLocale),
    setLocale: setAppLocale,
    t
  };
}
