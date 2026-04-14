import builtinManifest from "../../../assets/runtime_templates/commands/builtin/index.json";

export interface RuntimeLocaleConfig {
  defaultLocale: string;
  supportedLocales: string[];
  fallbackOrder: Record<string, string[]>;
}

interface BuiltinManifestWithLocaleConfig {
  localeConfig?: Partial<RuntimeLocaleConfig>;
}

const DEFAULT_RUNTIME_LOCALE_CONFIG: RuntimeLocaleConfig = {
  defaultLocale: "zh-CN",
  supportedLocales: ["zh-CN", "zh", "en-US", "en"],
  fallbackOrder: {
    "zh-CN": ["zh", "en-US", "en"],
    zh: ["zh-CN", "en-US", "en"],
    "en-US": ["en", "zh-CN", "zh"],
    en: ["en-US", "zh-CN", "zh"]
  }
};

function appendUnique(target: string[], value: string | undefined): void {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (normalized.length === 0 || target.includes(normalized)) {
    return;
  }
  target.push(normalized);
}

function normalizeLocaleList(values: unknown): string[] {
  if (!Array.isArray(values)) {
    return [];
  }
  const out: string[] = [];
  for (const value of values) {
    if (typeof value === "string") {
      appendUnique(out, value);
    }
  }
  return out;
}

export function getRuntimeLocaleCandidates(
  locale: string,
  config: RuntimeLocaleConfig
): string[] {
  const currentLocale = locale.trim();
  const shortLocale = currentLocale.split("-")[0] ?? "";
  const configuredFallbacks =
    config.fallbackOrder[currentLocale] ??
    config.fallbackOrder[shortLocale] ??
    [];

  const candidates: string[] = [];
  appendUnique(candidates, currentLocale);
  appendUnique(candidates, shortLocale);
  for (const fallbackLocale of configuredFallbacks) {
    appendUnique(candidates, fallbackLocale);
  }
  appendUnique(candidates, config.defaultLocale);
  return candidates;
}

export function getBuiltinRuntimeLocaleConfig(): RuntimeLocaleConfig {
  const manifestConfig = (builtinManifest as BuiltinManifestWithLocaleConfig).localeConfig;
  if (!manifestConfig) {
    return DEFAULT_RUNTIME_LOCALE_CONFIG;
  }

  const defaultLocale =
    typeof manifestConfig.defaultLocale === "string" && manifestConfig.defaultLocale.trim().length > 0
      ? manifestConfig.defaultLocale.trim()
      : DEFAULT_RUNTIME_LOCALE_CONFIG.defaultLocale;
  const supportedLocales = normalizeLocaleList(manifestConfig.supportedLocales);
  const fallbackOrder = Object.fromEntries(
    Object.entries(manifestConfig.fallbackOrder ?? {}).flatMap(([localeKey, values]) => {
      const normalizedKey = localeKey.trim();
      const normalizedValues = normalizeLocaleList(values);
      return normalizedKey.length > 0 && normalizedValues.length > 0
        ? [[normalizedKey, normalizedValues]]
        : [];
    })
  );

  return {
    defaultLocale,
    supportedLocales:
      supportedLocales.length > 0
        ? supportedLocales
        : DEFAULT_RUNTIME_LOCALE_CONFIG.supportedLocales,
    fallbackOrder:
      Object.keys(fallbackOrder).length > 0
        ? fallbackOrder
        : DEFAULT_RUNTIME_LOCALE_CONFIG.fallbackOrder
  };
}
