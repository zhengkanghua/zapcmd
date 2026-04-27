import { ref } from "vue";
import { describe, expect, it, vi } from "vitest";

import type { HotkeyFieldDefinition } from "../../../features/settings/types";
import {
  createDefaultSettingsSnapshot,
  type HotkeyFieldId,
  type TerminalReusePolicy
} from "../../../stores/settingsStore";
import { createSettingsState, type UseSettingsWindowOptions } from "../../settings/useSettingsWindow/model";
import { createTerminalActions } from "../../settings/useSettingsWindow/terminal";

type TerminalTestOptions = UseSettingsWindowOptions & {
  refreshAvailableTerminals: ReturnType<typeof vi.fn>;
  settingsStore: UseSettingsWindowOptions["settingsStore"] & {
    setDefaultTerminal: ReturnType<typeof vi.fn>;
    setLanguage: ReturnType<typeof vi.fn>;
    setAutoCheckUpdate: ReturnType<typeof vi.fn>;
  };
};

function createOptions(overrides: Partial<TerminalTestOptions> = {}): TerminalTestOptions {
  const baseSnapshot = createDefaultSettingsSnapshot();
  const defaultTerminal = ref("ghost");
  const terminalReusePolicy = ref<TerminalReusePolicy>("never");
  const language = ref<"zh-CN" | "en-US">("zh-CN");
  const autoCheckUpdate = ref(true);
  const launchAtLogin = ref(false);
  const alwaysElevatedTerminal = ref(false);
  const settingsStore = {
    persist: vi.fn(),
    hydrateFromStorage: vi.fn(),
    toSnapshot: vi.fn(() => baseSnapshot),
    applySnapshot: vi.fn(),
    setHotkey: vi.fn(),
    setPointerAction: vi.fn(),
    setDefaultTerminal: vi.fn((value: string) => {
      defaultTerminal.value = value;
    }),
    setLaunchAtLogin: vi.fn((value: boolean) => {
      launchAtLogin.value = value;
    }),
    setAlwaysElevatedTerminal: vi.fn((value: boolean) => {
      alwaysElevatedTerminal.value = value;
    }),
    setLanguage: vi.fn((value: "zh-CN" | "en-US") => {
      language.value = value;
    }),
    setAutoCheckUpdate: vi.fn((value: boolean) => {
      autoCheckUpdate.value = value;
    }),
    setTerminalReusePolicy: vi.fn((value: TerminalReusePolicy) => {
      terminalReusePolicy.value = value;
    })
  };

  const hotkeyDefinitions: HotkeyFieldDefinition[] = [
    { id: "launcher", label: "launcher", scope: "global" }
  ];

  return {
    settingsHashPrefix: "#settings:",
    hotkeyDefinitions,
    isSettingsWindow: ref(true),
    defaultTerminal,
    terminalReusePolicy,
    language,
    autoCheckUpdate,
    launchAtLogin,
    alwaysElevatedTerminal,
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
  it("selectTerminalOption 统一走 store action 持久化", () => {
    const options = createOptions();
    const state = createSettingsState();
    const persistSetting = vi.fn(async () => {});
    const actions = createTerminalActions({
      options,
      state,
      persistSetting
    });

    actions.selectTerminalOption("wt");

    expect(options.defaultTerminal.value).toBe("wt");
    expect(options.settingsStore.setDefaultTerminal).toHaveBeenCalledWith("wt");
    expect(persistSetting).toHaveBeenCalledTimes(1);
  });

  it("selectLanguageOption 统一走 store action 持久化", () => {
    const options = createOptions();
    const state = createSettingsState();
    const persistSetting = vi.fn(async () => {});
    const actions = createTerminalActions({
      options,
      state,
      persistSetting
    });

    actions.selectLanguageOption("en-US");

    expect(options.language.value).toBe("en-US");
    expect(options.settingsStore.setLanguage).toHaveBeenCalledWith("en-US");
    expect(persistSetting).toHaveBeenCalledTimes(1);
  });

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

  it("does not persist corrected terminal when refreshAvailableTerminals falls back after refresh failure", async () => {
    const options = createOptions({
      refreshAvailableTerminals: vi.fn(async () => {
        throw new Error("boom");
      })
    });
    const state = createSettingsState();
    const persistSetting = vi.fn(async () => {});
    const actions = createTerminalActions({
      options,
      state,
      persistSetting
    });

    await actions.refreshAvailableTerminals();

    expect(state.availableTerminals.value).toEqual([
      { id: "cmd", label: "Command Prompt", path: "cmd.exe" }
    ]);
    expect(options.defaultTerminal.value).toBe("ghost");
    expect(options.settingsStore.setDefaultTerminal).not.toHaveBeenCalled();
    expect(persistSetting).not.toHaveBeenCalled();
  });
});
