import { ref } from "vue";
import { describe, expect, it, vi } from "vitest";

import type { HotkeyFieldDefinition } from "../../../features/settings/types";
import { createDefaultSettingsSnapshot, type HotkeyFieldId } from "../../../stores/settingsStore";
import { createGeneralActions } from "../../settings/useSettingsWindow/general";
import { createSettingsState, type UseSettingsWindowOptions } from "../../settings/useSettingsWindow/model";

type GeneralTestOptions = UseSettingsWindowOptions & {
  terminalReusePolicy: { value: string };
  settingsStore: UseSettingsWindowOptions["settingsStore"] & {
    setTerminalReusePolicy: ReturnType<typeof vi.fn>;
  };
};

function createOptions(overrides: Partial<GeneralTestOptions> = {}): GeneralTestOptions {
  const baseSnapshot = createDefaultSettingsSnapshot();
  const settingsStore = {
    persist: vi.fn(),
    hydrateFromStorage: vi.fn(),
    toSnapshot: vi.fn(() => baseSnapshot),
    applySnapshot: vi.fn(),
    setHotkey: vi.fn(),
    setPointerAction: vi.fn(),
    setLaunchAtLogin: vi.fn(),
    setAlwaysElevatedTerminal: vi.fn(),
    setTerminalReusePolicy: vi.fn()
  };

  const hotkeyDefinitions: HotkeyFieldDefinition[] = [
    { id: "launcher", label: "launcher", scope: "global" }
  ];

  return {
    settingsHashPrefix: "#settings:",
    hotkeyDefinitions,
    isSettingsWindow: ref(true),
    defaultTerminal: ref("powershell"),
    terminalReusePolicy: ref("never"),
    language: ref("zh-CN"),
    autoCheckUpdate: ref(true),
    launchAtLogin: ref(false),
    alwaysElevatedTerminal: ref(false),
    pointerActions: ref(baseSnapshot.general.pointerActions),
    settingsStore,
    getHotkeyValue: vi.fn((field: HotkeyFieldId) => baseSnapshot.hotkeys[field]),
    setHotkeyValue: vi.fn(),
    isTauriRuntime: () => false,
    readAvailableTerminals: vi.fn(async () => []),
    readAutoStartEnabled: vi.fn(async () => false),
    writeAutoStartEnabled: vi.fn(async () => {}),
    writeLauncherHotkey: vi.fn(async () => {}),
    fallbackTerminalOptions: () => [],
    broadcastSettingsUpdated: vi.fn(),
    ...overrides
  };
}

describe("useSettingsWindow general actions", () => {
  it("setAlwaysElevatedTerminal persists immediately", () => {
    const options = createOptions();
    const state = createSettingsState();
    const persistSetting = vi.fn(async () => {});
    const applyAutoStartChange = vi.fn(async () => {});
    const actions = createGeneralActions({
      options,
      state,
      persistSetting,
      applyAutoStartChange
    });

    state.settingsError.value = "persist failed";
    state.settingsErrorRoute.value = "general";

    actions.setAlwaysElevatedTerminal(true);

    expect(options.alwaysElevatedTerminal.value).toBe(true);
    expect(options.settingsStore.setAlwaysElevatedTerminal).toHaveBeenCalledWith(true);
    expect(persistSetting).toHaveBeenCalledTimes(1);
    expect(state.settingsError.value).toBe("");
    expect(state.settingsErrorRoute.value).toBeNull();
  });

  it("setTerminalReusePolicy persists immediately", () => {
    const options = createOptions();
    const state = createSettingsState();
    const persistSetting = vi.fn(async () => {});
    const applyAutoStartChange = vi.fn(async () => {});
    const actions = createGeneralActions({
      options,
      state,
      persistSetting,
      applyAutoStartChange
    }) as ReturnType<typeof createGeneralActions> & {
      setTerminalReusePolicy?: (value: string) => void;
    };

    actions.setTerminalReusePolicy?.("normal-only");

    expect(options.terminalReusePolicy.value).toBe("normal-only");
    expect(options.settingsStore.setTerminalReusePolicy).toHaveBeenCalledWith("normal-only");
    expect(persistSetting).toHaveBeenCalledTimes(1);
  });

  it("loadAutoStartEnabled 遇到非布尔返回值时保留现有开机自启状态", async () => {
    const options = createOptions({
      isTauriRuntime: () => true,
      launchAtLogin: ref(false),
      readAutoStartEnabled: vi.fn(async () => undefined as unknown as boolean)
    });
    const state = createSettingsState();
    const actions = createGeneralActions({
      options,
      state,
      persistSetting: vi.fn(async () => {}),
      applyAutoStartChange: vi.fn(async () => {})
    });

    await actions.loadAutoStartEnabled();

    expect(options.launchAtLogin.value).toBe(false);
    expect(state.launchAtLoginBaseline.value).toBe(false);
    expect(state.launchAtLoginLoading.value).toBe(false);
  });
});
