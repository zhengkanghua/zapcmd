import { describe, expect, it } from "vitest";
import { DEFAULT_THEME_ID, THEME_REGISTRY } from "../themeRegistry";

describe("themeRegistry", () => {
  it("包含默认 obsidian 与浅色 linen 两个主题", () => {
    const ids = THEME_REGISTRY.map((t) => t.id);

    expect(THEME_REGISTRY.length).toBeGreaterThanOrEqual(2);
    expect(ids).toContain("obsidian");
    expect(ids).toContain("linen");
  });

  it("所有主题 id 唯一", () => {
    const ids = THEME_REGISTRY.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("主题元数据不再内嵌 preview 色值，由主题 token 派生预览", () => {
    for (const theme of THEME_REGISTRY) {
      expect("preview" in theme).toBe(false);
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
