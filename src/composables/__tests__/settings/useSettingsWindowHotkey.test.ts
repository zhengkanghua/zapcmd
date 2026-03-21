import { describe, expect, it } from "vitest";
import { createHotkeyActions } from "../../settings/useSettingsWindow/hotkey";

describe("useSettingsWindow hotkey actions", () => {
  it("does not expose legacy window-level hotkey recording api", () => {
    const actions = createHotkeyActions() as Record<string, unknown>;

    expect("startHotkeyRecording" in actions).toBe(false);
    expect("cancelHotkeyRecording" in actions).toBe(false);
    expect("applyRecordedHotkey" in actions).toBe(false);
    expect("isHotkeyRecording" in actions).toBe(false);
    expect("getHotkeyDisplay" in actions).toBe(false);
  });
});
