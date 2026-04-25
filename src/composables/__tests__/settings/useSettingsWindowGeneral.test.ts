import { ref } from "vue";
import { describe, expect, it, vi } from "vitest";

import type { HotkeyFieldDefinition } from "../../../features/settings/types";
import {
  createDefaultSettingsSnapshot,
  type HotkeyFieldId,
  type TerminalReusePolicy
} from "../../../stores/settingsStore";
import { createGeneralActions } from "../../settings/useSettingsWindow/general";
import { createSettingsState, type UseSettingsWindowOptions } from "../../settings/useSettingsWindow/model";

type GeneralTestOptions = UseSettingsWindowOptions & {
  terminalReusePolicy: { value: TerminalReusePolicy };
  settingsStore: UseSettingsWindowOptions["settingsStore"] & {
    setAutoCheckUpdate: ReturnType<typeof vi.fn>;
    setLanguage: ReturnType<typeof vi.fn>;
    setTerminalReusePolicy: ReturnType<typeof vi.fn>;
  };
};

function createOptions(overrides: Partial<GeneralTestOptions> = {}): GeneralTestOptions {
  const baseSnapshot = createDefaultSettingsSnapshot();
  const defaultTerminal = ref("powershell");
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
    setAutoCheckUpdate: vi.fn((value: boolean) => {
      autoCheckUpdate.value = value;
    }),
    setLanguage: vi.fn((value: "zh-CN" | "en-US") => {
      language.value = value;
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
    isTauriRuntime: () => false,
    readAvailableTerminals: vi.fn(async () => []),
    refreshAvailableTerminals: vi.fn(async () => []),
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
      setTerminalReusePolicy?: (value: TerminalReusePolicy) => void;
    };

    actions.setTerminalReusePolicy?.("normal-only");

    expect(options.terminalReusePolicy.value).toBe("normal-only");
    expect(options.settingsStore.setTerminalReusePolicy).toHaveBeenCalledWith("normal-only");
    expect(persistSetting).toHaveBeenCalledTimes(1);
  });

  it("setAutoCheckUpdate 统一走 store action 持久化", () => {
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

    actions.setAutoCheckUpdate(false);

    expect(options.autoCheckUpdate.value).toBe(false);
    expect(options.settingsStore.setAutoCheckUpdate).toHaveBeenCalledWith(false);
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
