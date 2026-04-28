import { ref } from "vue";
import { describe, expect, it, vi } from "vitest";

import {
  createDefaultSettingsSnapshot,
  type PointerActionFieldId,
  type SearchResultPointerAction,
  type TerminalReusePolicy
} from "../../../stores/settingsStore";
import { createPointerActions } from "../../settings/useSettingsWindow/pointer";
import { createSettingsState, type UseSettingsWindowOptions } from "../../settings/useSettingsWindow/model";

function createOptions() {
  const snapshot = createDefaultSettingsSnapshot();
  const defaultTerminal = ref(snapshot.general.defaultTerminal);
  const terminalReusePolicy = ref<TerminalReusePolicy>(snapshot.general.terminalReusePolicy);
  const language = ref(snapshot.general.language);
  const autoCheckUpdate = ref(snapshot.general.autoCheckUpdate);
  const launchAtLogin = ref(snapshot.general.launchAtLogin);
  const alwaysElevatedTerminal = ref(snapshot.general.alwaysElevatedTerminal);
  const queueAutoClearOnSuccess = ref(snapshot.general.queueAutoClearOnSuccess);
  const pointerActions = ref(snapshot.general.pointerActions);

  return {
    settingsHashPrefix: "#settings:",
    hotkeyDefinitions: [],
    isSettingsWindow: ref(true),
    defaultTerminal,
    terminalReusePolicy,
    language,
    autoCheckUpdate,
    launchAtLogin,
    alwaysElevatedTerminal,
    queueAutoClearOnSuccess,
    pointerActions,
    settingsStore: {
      persist: vi.fn(),
      hydrateFromStorage: vi.fn(),
      toSnapshot: vi.fn(() => snapshot),
      applySnapshot: vi.fn(),
      setHotkey: vi.fn(),
      setPointerAction: vi.fn((field: PointerActionFieldId, action: SearchResultPointerAction) => {
        pointerActions.value[field] = action;
      }),
      setDefaultTerminal: vi.fn((value: string) => {
        defaultTerminal.value = value;
      }),
      setLanguage: vi.fn((value: "zh-CN" | "en-US") => {
        language.value = value;
      }),
      setAutoCheckUpdate: vi.fn((value: boolean) => {
        autoCheckUpdate.value = value;
      }),
      setLaunchAtLogin: vi.fn((value: boolean) => {
        launchAtLogin.value = value;
      }),
      setAlwaysElevatedTerminal: vi.fn((value: boolean) => {
        alwaysElevatedTerminal.value = value;
      }),
      setQueueAutoClearOnSuccess: vi.fn((value: boolean) => {
        queueAutoClearOnSuccess.value = value;
      }),
      setTerminalReusePolicy: vi.fn((value: TerminalReusePolicy) => {
        terminalReusePolicy.value = value;
      })
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

  it("pointer action 变更后不再手动重建 ref 对象", async () => {
    const options = createOptions();
    const originalPointerActions = options.pointerActions.value;
    const state = createSettingsState();
    const persistSetting = vi.fn(async () => {});
    const actions = createPointerActions({ options, state, persistSetting });

    await actions.applyPointerActionChange("leftClick", "copy");

    expect(options.pointerActions.value).toBe(originalPointerActions);
    expect(options.settingsStore.setPointerAction).toHaveBeenCalledWith("leftClick", "copy");
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
