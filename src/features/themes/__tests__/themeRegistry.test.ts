import { describe, expect, it } from "vitest";
import { DEFAULT_THEME_ID, THEME_REGISTRY } from "../themeRegistry";

describe("themeRegistry", () => {
  it("包含至少一个主题", () => {
    expect(THEME_REGISTRY.length).toBeGreaterThanOrEqual(1);
  });

  it("所有主题 id 唯一", () => {
    const ids = THEME_REGISTRY.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("所有主题 preview 字段完整", () => {
    for (const theme of THEME_REGISTRY) {
      expect(theme.preview.bg).toBeTruthy();
      expect(theme.preview.surface).toBeTruthy();
      expect(theme.preview.accent).toBeTruthy();
      expect(theme.preview.text).toBeTruthy();
    }
  });

  it("DEFAULT_THEME_ID 指向有效主题", () => {
    const found = THEME_REGISTRY.find((t) => t.id === DEFAULT_THEME_ID);
    expect(found).toBeTruthy();
  });

  it("主题 id 为合法 CSS 标识符（仅小写字母/数字/连字符）", () => {
    for (const theme of THEME_REGISTRY) {
      expect(theme.id).toMatch(/^[a-z][a-z0-9-]*$/);
    }
  });
});
