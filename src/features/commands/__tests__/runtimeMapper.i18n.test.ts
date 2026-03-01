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
});
