import { ref } from "vue";
import { describe, expect, it, vi } from "vitest";

import { createDefaultSettingsSnapshot } from "../../../stores/settingsStore";
import { createPointerActions } from "../../settings/useSettingsWindow/pointer";
import { createSettingsState, type UseSettingsWindowOptions } from "../../settings/useSettingsWindow/model";

function createOptions() {
  const snapshot = createDefaultSettingsSnapshot();

  return {
    settingsHashPrefix: "#settings:",
    hotkeyDefinitions: [],
    isSettingsWindow: ref(true),
    defaultTerminal: ref(snapshot.general.defaultTerminal),
    terminalReusePolicy: ref(snapshot.general.terminalReusePolicy),
    language: ref(snapshot.general.language),
    autoCheckUpdate: ref(snapshot.general.autoCheckUpdate),
    launchAtLogin: ref(snapshot.general.launchAtLogin),
    alwaysElevatedTerminal: ref(snapshot.general.alwaysElevatedTerminal),
    pointerActions: ref(snapshot.general.pointerActions),
    settingsStore: {
      persist: vi.fn(),
      hydrateFromStorage: vi.fn(),
      toSnapshot: vi.fn(() => snapshot),
      applySnapshot: vi.fn(),
      setHotkey: vi.fn(),
      setPointerAction: vi.fn(),
      setLaunchAtLogin: vi.fn(),
      setAlwaysElevatedTerminal: vi.fn(),
      setTerminalReusePolicy: vi.fn()
    },
    getHotkeyValue: vi.fn(() => ""),
    setHotkeyValue: vi.fn(),
    isTauriRuntime: () => false,
    readAvailableTerminals: vi.fn(async () => []),
    refreshAvailableTerminals: vi.fn(async () => []),
    readAutoStartEnabled: vi.fn(async () => false),
    writeAutoStartEnabled: vi.fn(async () => {}),
    writeLauncherHotkey: vi.fn(async () => {}),
    fallbackTerminalOptions: () => [],
    broadcastSettingsUpdated: vi.fn()
  } satisfies UseSettingsWindowOptions;
}

describe("useSettingsWindow pointer actions", () => {
  it("persists pointer action changes immediately", async () => {
    const options = createOptions();
    const state = createSettingsState();
    const persistSetting = vi.fn(async () => {});
    const actions = createPointerActions({ options, state, persistSetting });

    state.settingsError.value = "stale";

    await actions.applyPointerActionChange("leftClick", "copy");

    expect(options.pointerActions.value.leftClick).toBe("copy");
    expect(options.settingsStore.setPointerAction).toHaveBeenCalledWith("leftClick", "copy");
    expect(persistSetting).toHaveBeenCalledTimes(1);
    expect(state.settingsError.value).toBe("");
    expect(state.settingsErrorRoute.value).toBeNull();
  });

  it("shows the thrown error message when persistence fails with Error", async () => {
    const options = createOptions();
    const state = createSettingsState();
    const persistSetting = vi.fn(async () => {
      throw new Error("save failed");
    });
    const actions = createPointerActions({ options, state, persistSetting });

    await actions.applyPointerActionChange("rightClick", "execute");

    expect(state.settingsError.value).toBe("save failed");
    expect(state.settingsErrorRoute.value).toBe("hotkeys");
  });

  it("falls back to localized save error when persistence rejects without Error", async () => {
    const options = createOptions();
    const state = createSettingsState();
    const persistSetting = vi.fn(async () => {
      throw "unknown";
    });
    const actions = createPointerActions({ options, state, persistSetting });

    await actions.applyPointerActionChange("rightClick", "stage");

    expect(state.settingsError.value).toBe("保存设置到本地失败。");
    expect(state.settingsErrorRoute.value).toBe("hotkeys");
  });
});
