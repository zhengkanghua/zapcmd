import { beforeEach, describe, expect, it } from "vitest";

import { normalizeAppLocale, setAppLocale, t } from "../index";

describe("i18n runtime", () => {
  beforeEach(() => {
    setAppLocale("zh-CN");
  });

  it("normalizes supported locale aliases", () => {
    expect(normalizeAppLocale("en")).toBe("en-US");
    expect(normalizeAppLocale("en-US")).toBe("en-US");
    expect(normalizeAppLocale("zh")).toBe("zh-CN");
    expect(normalizeAppLocale("zh-CN")).toBe("zh-CN");
    expect(normalizeAppLocale("unknown")).toBe("zh-CN");
  });

  it("translates by current locale and supports interpolation", () => {
    expect(t("settings.title")).toBe("设置");
    expect(t("launcher.queueTitle", { count: 3 })).toBe("执行流 3");

    setAppLocale("en-US");
    expect(t("settings.title")).toBe("Settings");
    expect(t("launcher.queueTitle", { count: 3 })).toBe("Flow 3");
  });

  it("falls back to message key when translation key is missing", () => {
    expect(t("non.existing.key")).toBe("non.existing.key");
  });
});
