import path from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { parse } from "yaml";

function assertCondition(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function normalizeLocaleList(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((item) => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function normalizeFallbackOrder(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const output = {};
  for (const [key, list] of Object.entries(value)) {
    if (typeof key !== "string") {
      continue;
    }
    const normalizedKey = key.trim();
    if (normalizedKey.length === 0) {
      continue;
    }
    const normalizedList = normalizeLocaleList(list);
    if (normalizedList.length === 0) {
      continue;
    }
    output[normalizedKey] = normalizedList;
  }
  return output;
}

/**
 * 读取 catalog locales/config.yaml。
 *
 * 兼容 legacy 仓库：如果 config 不存在，则返回一份安全默认值，避免 generator 直接失败。
 */
export function readCatalogLocaleConfig(sourceDir) {
  const configPath = path.join(sourceDir, "locales", "config.yaml");
  if (!existsSync(configPath)) {
    return {
      defaultLocale: "zh",
      supportedLocales: ["zh"],
      fallbackOrder: {
        zh: ["zh"]
      }
    };
  }

  const raw = readFileSync(configPath, "utf8");
  const parsed = parse(raw);
  assertCondition(
    parsed && typeof parsed === "object" && !Array.isArray(parsed),
    "locales/config.yaml must contain a top-level object."
  );

  const defaultLocale =
    typeof parsed.defaultLocale === "string" && parsed.defaultLocale.trim().length > 0
      ? parsed.defaultLocale.trim()
      : "zh";

  const supportedLocales = normalizeLocaleList(parsed.supportedLocales);
  if (!supportedLocales.includes(defaultLocale)) {
    supportedLocales.unshift(defaultLocale);
  }

  return {
    defaultLocale,
    requiredBuiltinLocales: normalizeLocaleList(parsed.requiredBuiltinLocales),
    supportedLocales,
    fallbackOrder: normalizeFallbackOrder(parsed.fallbackOrder)
  };
}

