import { describe, expect, it } from "vitest";
import {
  DEFAULT_MOTION_PRESET_ID,
  MOTION_PRESET_REGISTRY,
  resolveMotionPresetMeta
} from "../motionRegistry";

describe("motionRegistry", () => {
  it("contains expressive and steady-tool presets", () => {
    expect(MOTION_PRESET_REGISTRY.map((item) => item.id)).toEqual(
      expect.arrayContaining(["expressive", "steady-tool"])
    );
    expect(DEFAULT_MOTION_PRESET_ID).toBe("expressive");
  });

  it("falls back to expressive for unknown ids", () => {
    expect(resolveMotionPresetMeta("unknown").id).toBe("expressive");
  });
});
