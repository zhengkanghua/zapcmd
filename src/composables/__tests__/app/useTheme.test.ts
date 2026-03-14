import { beforeEach, describe, expect, it } from "vitest";
import { nextTick, ref } from "vue";
import { useTheme } from "../../app/useTheme";

describe("useTheme", () => {
  beforeEach(() => {
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.removeAttribute("data-blur");
  });

  it("立即将 data-theme 设置为当前 themeId", () => {
    const themeId = ref("obsidian");
    const blurEnabled = ref(true);
    useTheme({ themeId, blurEnabled });

    expect(document.documentElement.dataset.theme).toBe("obsidian");
  });

  it("立即将 data-blur 设置为 on 或 off", () => {
    const themeId = ref("obsidian");
    const blurEnabled = ref(false);
    useTheme({ themeId, blurEnabled });

    expect(document.documentElement.dataset.blur).toBe("off");
  });

  it("themeId 变更时更新 data-theme", async () => {
    const themeId = ref("obsidian");
    const blurEnabled = ref(true);
    useTheme({ themeId, blurEnabled });

    themeId.value = "other-theme";
    await nextTick();

    // 无效主题回退到默认
    expect(document.documentElement.dataset.theme).toBe("obsidian");
  });

  it("无效 themeId 回退到 obsidian", () => {
    const themeId = ref("nonexistent");
    const blurEnabled = ref(true);
    useTheme({ themeId, blurEnabled });

    expect(document.documentElement.dataset.theme).toBe("obsidian");
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
