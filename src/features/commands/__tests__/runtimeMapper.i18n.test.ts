import { afterEach, describe, expect, it } from "vitest";

import { setAppLocale } from "../../../i18n";
import { resolveRuntimeText } from "../runtimeMapper";

describe("runtimeMapper locale preference", () => {
  afterEach(() => {
    setAppLocale("zh-CN");
  });

  it("prefers english localized text when locale is en-US", () => {
    setAppLocale("en-US");
    expect(
      resolveRuntimeText({
        zh: "中文",
        "en-US": "English"
      })
    ).toBe("English");
  });

  it("falls back to zh-CN when localized key is missing", () => {
    setAppLocale("en-US");
    expect(
      resolveRuntimeText({
        zh: "中文"
      })
    ).toBe("中文");
  });

  it("resolves displayName-like localized text with locale priority", () => {
    expect(
      resolveRuntimeText({
        "zh-CN": "Docker Desktop",
        "en-US": "Docker Desktop"
      })
    ).toBe("Docker Desktop");
  });

  it("falls back to zh locale for resolutionHint-like localized text", () => {
    setAppLocale("en-US");
    expect(
      resolveRuntimeText({
        zh: "安装 Docker Desktop 后重试"
      })
    ).toBe("安装 Docker Desktop 后重试");
  });
});
