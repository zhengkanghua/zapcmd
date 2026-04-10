import { ref } from "vue";
import { describe, expect, it, vi } from "vitest";

import type { HotkeyFieldDefinition } from "../../../features/settings/types";
import { createDefaultSettingsSnapshot, type HotkeyFieldId } from "../../../stores/settingsStore";
import { createSettingsState, type UseSettingsWindowOptions } from "../../settings/useSettingsWindow/model";
import { createTerminalActions } from "../../settings/useSettingsWindow/terminal";

type TerminalTestOptions = UseSettingsWindowOptions & {
  refreshAvailableTerminals: ReturnType<typeof vi.fn>;
};

function createOptions(overrides: Partial<TerminalTestOptions> = {}): TerminalTestOptions {
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
    defaultTerminal: ref("ghost"),
    terminalReusePolicy: ref("never"),
    language: ref("zh-CN"),
    autoCheckUpdate: ref(true),
    launchAtLogin: ref(false),
    alwaysElevatedTerminal: ref(false),
    pointerActions: ref(baseSnapshot.general.pointerActions),
    settingsStore,
    getHotkeyValue: vi.fn((field: HotkeyFieldId) => baseSnapshot.hotkeys[field]),
    setHotkeyValue: vi.fn(),
    isTauriRuntime: () => true,
    readAvailableTerminals: vi.fn(async () => [{ id: "powershell", label: "PowerShell", path: "powershell.exe" }]),
    refreshAvailableTerminals: vi.fn(async () => [{ id: "wt", label: "Windows Terminal", path: "wt.exe" }]),
    readAutoStartEnabled: vi.fn(async () => false),
    writeAutoStartEnabled: vi.fn(async () => {}),
    writeLauncherHotkey: vi.fn(async () => {}),
    fallbackTerminalOptions: () => [{ id: "cmd", label: "Command Prompt", path: "cmd.exe" }],
    broadcastSettingsUpdated: vi.fn(),
    ...overrides
  };
}

describe("useSettingsWindow terminal actions", () => {
  it("refreshAvailableTerminals bypasses cached read and re-runs ensureDefaultTerminal", async () => {
    const options = createOptions();
    const state = createSettingsState();
    const persistSetting = vi.fn(async () => {});
    const actions = createTerminalActions({
      options,
      state,
      persistSetting
    }) as ReturnType<typeof createTerminalActions> & {
      refreshAvailableTerminals: () => Promise<void>;
    };

    await actions.refreshAvailableTerminals();

    expect(options.refreshAvailableTerminals).toHaveBeenCalledTimes(1);
    expect(options.readAvailableTerminals).not.toHaveBeenCalled();
    expect(state.availableTerminals.value).toEqual([
      { id: "wt", label: "Windows Terminal", path: "wt.exe" }
    ]);
    expect(options.defaultTerminal.value).toBe("wt");
    expect(persistSetting).toHaveBeenCalledTimes(1);
  });
});
