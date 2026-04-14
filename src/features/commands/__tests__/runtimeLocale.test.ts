import { afterEach, describe, expect, it, vi } from "vitest";

const MANIFEST_MODULE_PATH = "../../../../assets/runtime_templates/commands/builtin/index.json";

async function importRuntimeLocaleWithManifest(manifest: unknown) {
  vi.resetModules();
  vi.doMock(MANIFEST_MODULE_PATH, () => ({
    default: manifest
  }));
  return import("../runtimeLocale");
}

afterEach(() => {
  vi.resetModules();
  vi.doUnmock(MANIFEST_MODULE_PATH);
});

describe("runtimeLocale manifest normalization", () => {
  it("falls back to built-in defaults when manifest localeConfig is missing", async () => {
    const { getBuiltinRuntimeLocaleConfig } = await importRuntimeLocaleWithManifest({});

    expect(getBuiltinRuntimeLocaleConfig()).toEqual({
      defaultLocale: "zh-CN",
      supportedLocales: ["zh-CN", "zh", "en-US", "en"],
      fallbackOrder: {
        "zh-CN": ["zh", "en-US", "en"],
        zh: ["zh-CN", "en-US", "en"],
        "en-US": ["en", "zh-CN", "zh"],
        en: ["en-US", "zh-CN", "zh"]
      }
    });
  });

  it("falls back to default locale lists when manifest config contains blanks or invalid values", async () => {
    const { getBuiltinRuntimeLocaleConfig } = await importRuntimeLocaleWithManifest({
      localeConfig: {
        defaultLocale: "   ",
        supportedLocales: ["", "   ", 123],
        fallbackOrder: {
          "": ["en"],
          zh: "bad"
        }
      }
    });

    expect(getBuiltinRuntimeLocaleConfig()).toEqual({
      defaultLocale: "zh-CN",
      supportedLocales: ["zh-CN", "zh", "en-US", "en"],
      fallbackOrder: {
        "zh-CN": ["zh", "en-US", "en"],
        zh: ["zh-CN", "en-US", "en"],
        "en-US": ["en", "zh-CN", "zh"],
        en: ["en-US", "zh-CN", "zh"]
      }
    });
  });

  it("normalizes localeConfig lists by trimming and removing duplicates", async () => {
    const { getBuiltinRuntimeLocaleConfig } = await importRuntimeLocaleWithManifest({
      localeConfig: {
        defaultLocale: " en-US ",
        supportedLocales: [" en-US ", "en-US", " fr ", "", "fr"],
        fallbackOrder: {
          "fr-CA": [" fr ", "en-US", "", "fr"],
          "en-US": [" en ", "en", " zh "]
        }
      }
    });

    expect(getBuiltinRuntimeLocaleConfig()).toEqual({
      defaultLocale: "en-US",
      supportedLocales: ["en-US", "fr"],
      fallbackOrder: {
        "fr-CA": ["fr", "en-US"],
        "en-US": ["en", "zh"]
      }
    });
  });
});
