import { beforeEach, describe, expect, it } from "vitest";
import { nextTick, ref } from "vue";
import { useMotionPreset } from "../../app/useMotionPreset";
import { setAppLocale } from "../../../i18n";

describe("useMotionPreset", () => {
  beforeEach(() => {
    setAppLocale("zh-CN");
    document.documentElement.removeAttribute("data-motion-preset");
  });

  it("immediately writes data-motion-preset", () => {
    const presetId = ref("expressive");
    useMotionPreset({ presetId });

    expect(document.documentElement.dataset.motionPreset).toBe("expressive");
  });

  it("falls back invalid ids to expressive", () => {
    const presetId = ref("bad-id");
    useMotionPreset({ presetId });

    expect(document.documentElement.dataset.motionPreset).toBe("expressive");
  });

  it("updates data-motion-preset when preset changes", async () => {
    const presetId = ref("expressive");
    useMotionPreset({ presetId });

    presetId.value = "steady-tool";
    await nextTick();

    expect(document.documentElement.dataset.motionPreset).toBe("steady-tool");
  });

  it("does not expose user-facing Chinese motion copy in metadata when locale switches to en-US", () => {
    const presetId = ref("expressive");
    const model = useMotionPreset({ presetId });

    setAppLocale("en-US");

    expect(model.motionPresets.some((preset) => /[\u4e00-\u9fff]/.test(JSON.stringify(preset)))).toBe(false);
  });
});
