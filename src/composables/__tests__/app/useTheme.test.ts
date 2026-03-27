import { beforeEach, describe, expect, it } from "vitest";
import { nextTick, ref } from "vue";
import { useTheme } from "../../app/useTheme";

describe("useTheme", () => {
  beforeEach(() => {
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.removeAttribute("data-blur");
    document.documentElement.style.colorScheme = "";
  });

  it("立即将 data-theme 与 color-scheme 设置为当前主题", () => {
    const themeId = ref("obsidian");
    const blurEnabled = ref(true);
    useTheme({ themeId, blurEnabled });

    expect(document.documentElement.dataset.theme).toBe("obsidian");
    expect(document.documentElement.style.colorScheme).toBe("dark");
  });

  it("立即将 data-blur 设置为 on 或 off", () => {
    const themeId = ref("obsidian");
    const blurEnabled = ref(false);
    useTheme({ themeId, blurEnabled });

    expect(document.documentElement.dataset.blur).toBe("off");
  });

  it("themeId 变更时更新 data-theme 与 color-scheme", async () => {
    const themeId = ref("obsidian");
    const blurEnabled = ref(true);
    useTheme({ themeId, blurEnabled });

    themeId.value = "linen";
    await nextTick();

    expect(document.documentElement.dataset.theme).toBe("linen");
    expect(document.documentElement.style.colorScheme).toBe("light");
  });

  it("无效 themeId 回退到 obsidian", () => {
    const themeId = ref("nonexistent");
    const blurEnabled = ref(true);
    useTheme({ themeId, blurEnabled });

    expect(document.documentElement.dataset.theme).toBe("obsidian");
    expect(document.documentElement.style.colorScheme).toBe("dark");
  });

  it("blurEnabled 变更时更新 data-blur", async () => {
    const themeId = ref("obsidian");
    const blurEnabled = ref(true);
    useTheme({ themeId, blurEnabled });

    expect(document.documentElement.dataset.blur).toBe("on");

    blurEnabled.value = false;
    await nextTick();

    expect(document.documentElement.dataset.blur).toBe("off");
  });
});
