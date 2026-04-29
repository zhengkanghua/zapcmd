import { ref } from "vue";
import { describe, expect, it, vi } from "vitest";

import type { HotkeyFieldDefinition } from "../../../features/settings/types";
import {
  createDefaultSettingsSnapshot,
  type HotkeyFieldId,
  type PointerActionFieldId,
  type SearchResultPointerAction
} from "../../../stores/settingsStore";
import { createPersistenceActions } from "../../settings/useSettingsWindow/persistence";
import { createTerminalActions } from "../../settings/useSettingsWindow/terminal";
import { createSettingsState, type UseSettingsWindowOptions } from "../../settings/useSettingsWindow/model";

function createHarness(overrides: Partial<UseSettingsWindowOptions> = {}) {
  const hotkeyDefinitions: HotkeyFieldDefinition[] = [
    {
      id: "launcher",
      label: "launcher",
      scope: "global"
    }
  ];

  const baseSnapshot = createDefaultSettingsSnapshot();
  const defaultTerminal = overrides.defaultTerminal ?? ref("powershell");
  const language = overrides.language ?? ref<"zh-CN" | "en-US">("zh-CN");
  const autoCheckUpdate = overrides.autoCheckUpdate ?? ref(true);
  const launchAtLogin = overrides.launchAtLogin ?? ref(false);
  const alwaysElevatedTerminal = overrides.alwaysElevatedTerminal ?? ref(false);
  const pointerActions =
    overrides.pointerActions ??
    ref({
      leftClick: "action-panel",
      rightClick: "stage"
    });

  const settingsStore = {
    persist: vi.fn(),
    hydrateFromStorage: vi.fn(),
    toSnapshot: vi.fn(() => ({
      ...baseSnapshot,
      hotkeys: {
        ...baseSnapshot.hotkeys,
        launcher: "Alt+K"
      },
      general: {
        ...baseSnapshot.general,
        defaultTerminal: "powershell",
        language: "zh-CN" as const,
        autoCheckUpdate: true,
        launchAtLogin: false
      }
    })),
    applySnapshot: vi.fn(),
    setHotkey: vi.fn(),
    setPointerAction: vi.fn((field: PointerActionFieldId, action: SearchResultPointerAction) => {
      pointerActions.value[field] = action;
    }),
    setLaunchAtLogin: vi.fn((value: boolean) => {
      launchAtLogin.value = value;
    }),
    setAlwaysElevatedTerminal: vi.fn((value: boolean) => {
      alwaysElevatedTerminal.value = value;
    }),
    setDefaultTerminal: vi.fn((value: string) => {
      defaultTerminal.value = value;
    }),
    setLanguage: vi.fn((value: "zh-CN" | "en-US") => {
      language.value = value;
    }),
    setAutoCheckUpdate: vi.fn((value: boolean) => {
      autoCheckUpdate.value = value;
    })
  };

  const options: UseSettingsWindowOptions = {
    settingsHashPrefix: "#settings:",
    hotkeyDefinitions,
    isSettingsWindow: ref(true),
    defaultTerminal,
    language,
    autoCheckUpdate,
    launchAtLogin,
    alwaysElevatedTerminal,
    pointerActions,
    settingsStore,
    getHotkeyValue: vi.fn(() => "Alt+K"),
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

  const state = createSettingsState();
  const terminalRefs: {
    ensureDefaultTerminal?: (options?: { allowPersist?: boolean }) => boolean;
  } = {};

  const actions = createPersistenceActions({
    options,
    state,
    ensureDefaultTerminal: (ensureOptions) =>
      terminalRefs.ensureDefaultTerminal?.(ensureOptions) ?? false
  });
  const terminal = createTerminalActions({
    options,
    state,
    persistSetting: actions.persistSetting
  });
  terminalRefs.ensureDefaultTerminal = terminal.ensureDefaultTerminal;

  return {
    options,
    settingsStore,
    state,
    actions,
    terminal
  };
}

describe("useSettingsWindow persistence", () => {
  it("does not persist corrected default terminal after non-tauri fallback loadSettings", async () => {
    const harness = createHarness({
      defaultTerminal: ref("ghost"),
      fallbackTerminalOptions: () => [{ id: "cmd", label: "Command Prompt", path: "cmd.exe" }]
    });

    harness.actions.loadSettings();

    expect(harness.options.defaultTerminal.value).toBe("ghost");
    expect(harness.settingsStore.persist).not.toHaveBeenCalled();
    expect(harness.options.broadcastSettingsUpdated).not.toHaveBeenCalled();
  });

  it("persists and broadcasts on single setting change", async () => {
    const harness = createHarness();

    await harness.actions.persistSetting();

    expect(harness.settingsStore.persist).toHaveBeenCalledTimes(1);
    expect(harness.options.broadcastSettingsUpdated).toHaveBeenCalledTimes(1);
  });

  it("persists and broadcasts after applying a valid hotkey change", async () => {
    const hotkeys: Partial<Record<HotkeyFieldId, string>> = {
      launcher: "Alt+K"
    };
    const harness = createHarness({
      getHotkeyValue: vi.fn((field: HotkeyFieldId) => hotkeys[field] ?? ""),
      setHotkeyValue: vi.fn((field: HotkeyFieldId, value: string) => {
        hotkeys[field] = value;
      })
    });

    await harness.actions.applyHotkeyChange("launcher", "Alt+X");

    expect(harness.settingsStore.setHotkey).toHaveBeenCalledWith("launcher", "Alt+X");
    expect(harness.settingsStore.persist).toHaveBeenCalledTimes(1);
    expect(harness.options.broadcastSettingsUpdated).toHaveBeenCalledTimes(1);
    expect(harness.state.settingsError.value).toBe("");
  });

  it("reports a validation issue when required hotkey is cleared", async () => {
    const hotkeys: Partial<Record<HotkeyFieldId, string>> = {
      launcher: "Alt+K"
    };
    const harness = createHarness({
      getHotkeyValue: vi.fn((field: HotkeyFieldId) => hotkeys[field] ?? ""),
      setHotkeyValue: vi.fn((field: HotkeyFieldId, value: string) => {
        hotkeys[field] = value;
      })
    });

    await harness.actions.applyHotkeyChange("launcher", "");

    expect(harness.settingsStore.setHotkey).not.toHaveBeenCalled();
    expect(harness.settingsStore.persist).not.toHaveBeenCalled();
    expect(harness.options.broadcastSettingsUpdated).not.toHaveBeenCalled();
    expect(harness.state.settingsError.value).toContain("不能为空");
    expect(harness.state.settingsErrorRoute.value).toBe("hotkeys");
    expect(harness.state.settingsErrorHotkeyFieldIds.value).toEqual(["launcher"]);
    expect(harness.state.settingsErrorPrimaryHotkeyField.value).toBe("launcher");
  });

  it("reports a validation issue when duplicate hotkeys are entered", async () => {
    const hotkeys: Partial<Record<HotkeyFieldId, string>> = {
      launcher: "Alt+K",
      toggleQueue: "Ctrl+K"
    };
    const harness = createHarness({
      hotkeyDefinitions: [
        { id: "launcher", label: "launcher", scope: "global" },
        { id: "toggleQueue", label: "toggleQueue", scope: "global" }
      ],
      getHotkeyValue: vi.fn((field: HotkeyFieldId) => hotkeys[field] ?? ""),
      setHotkeyValue: vi.fn((field: HotkeyFieldId, value: string) => {
        hotkeys[field] = value;
      })
    });

    await harness.actions.applyHotkeyChange("launcher", "Ctrl+K");

    expect(harness.settingsStore.setHotkey).not.toHaveBeenCalled();
    expect(harness.settingsStore.persist).not.toHaveBeenCalled();
    expect(harness.options.broadcastSettingsUpdated).not.toHaveBeenCalled();
    expect(harness.state.settingsError.value).not.toBe("");
    expect(harness.state.settingsErrorRoute.value).toBe("hotkeys");
    expect(harness.state.settingsErrorHotkeyFieldIds.value.sort()).toEqual(["launcher", "toggleQueue"].sort());
    expect(harness.state.settingsErrorPrimaryHotkeyField.value).toBe("launcher");
  });

  it("preserves hotkey conflict state while non-tauri terminal fallback avoids corrected-default persistence", async () => {
    const harness = createHarness({
      defaultTerminal: ref("ghost"),
      fallbackTerminalOptions: () => [{ id: "cmd", label: "Command Prompt", path: "cmd.exe" }]
    });

    harness.state.settingsError.value = "duplicate hotkey";
    harness.state.settingsErrorRoute.value = "hotkeys";
    harness.state.settingsErrorHotkeyFieldIds.value = ["launcher", "toggleQueue"];
    harness.state.settingsErrorPrimaryHotkeyField.value = "launcher";

    await harness.terminal.loadAvailableTerminals();

    expect(harness.options.defaultTerminal.value).toBe("ghost");
    expect(harness.settingsStore.persist).not.toHaveBeenCalled();
    expect(harness.options.broadcastSettingsUpdated).not.toHaveBeenCalled();
    expect(harness.state.settingsError.value).toBe("duplicate hotkey");
    expect(harness.state.settingsErrorRoute.value).toBe("hotkeys");
    expect(harness.state.settingsErrorHotkeyFieldIds.value).toEqual(["launcher", "toggleQueue"]);
    expect(harness.state.settingsErrorPrimaryHotkeyField.value).toBe("launcher");
  });

  it("captures persist failure and skips broadcasting", async () => {
    const harness = createHarness();
    vi.mocked(harness.settingsStore.persist).mockImplementationOnce(() => {
      throw new Error("persist failed");
    });

    await harness.actions.persistSetting();

    expect(harness.options.broadcastSettingsUpdated).not.toHaveBeenCalled();
    expect(harness.state.settingsError.value).toBe("persist failed");
    expect(harness.state.settingsErrorRoute.value).toBeNull();
  });

  it("captures broadcast failure after persisting", async () => {
    const harness = createHarness();
    vi.mocked(harness.options.broadcastSettingsUpdated).mockImplementationOnce(() => {
      throw new Error("broadcast failed");
    });

    await harness.actions.persistSetting();

    expect(harness.settingsStore.persist).toHaveBeenCalledTimes(1);
    expect(harness.options.broadcastSettingsUpdated).toHaveBeenCalledTimes(1);
    expect(harness.state.settingsError.value).toBe("broadcast failed");
    expect(harness.state.settingsErrorRoute.value).toBeNull();
  });

  it("falls back to localized broadcast error when broadcaster throws non-Error", async () => {
    const harness = createHarness();
    vi.mocked(harness.options.broadcastSettingsUpdated).mockImplementationOnce(() => {
      throw "unknown";
    });

    await harness.actions.persistSetting();

    expect(harness.settingsStore.persist).toHaveBeenCalledTimes(1);
    expect(harness.state.settingsError.value).toBe("同步设置失败。");
    expect(harness.state.settingsErrorRoute.value).toBeNull();
  });

  it("rolls back hotkey on writeLauncherHotkey failure", async () => {
    const harness = createHarness({
      isTauriRuntime: () => true
    });
    vi.mocked(harness.options.writeLauncherHotkey).mockRejectedValueOnce(new Error("hotkey write failed"));

    await harness.actions.applyHotkeyChange("launcher", "Alt+X");

    expect(harness.settingsStore.persist).not.toHaveBeenCalled();
    expect(harness.options.broadcastSettingsUpdated).not.toHaveBeenCalled();
    expect(harness.options.setHotkeyValue).toHaveBeenLastCalledWith("launcher", "Alt+K");
    expect(harness.settingsStore.setHotkey).toHaveBeenLastCalledWith("launcher", "Alt+K");
    expect(harness.state.settingsError.value).toBe("hotkey write failed");
    expect(harness.state.settingsErrorHotkeyFieldIds.value).toEqual(["launcher"]);
    expect(harness.state.settingsErrorPrimaryHotkeyField.value).toBe("launcher");
  });

  it("rolls back auto-start toggle on write failure", async () => {
    const harness = createHarness({
      isTauriRuntime: () => true,
      launchAtLogin: ref(false)
    });
    vi.mocked(harness.options.writeAutoStartEnabled).mockRejectedValueOnce(new Error("autostart failed"));

    await harness.actions.applyAutoStartChange(true);

    expect(harness.settingsStore.persist).not.toHaveBeenCalled();
    expect(harness.options.broadcastSettingsUpdated).not.toHaveBeenCalled();
    expect(harness.options.launchAtLogin.value).toBe(false);
    expect(harness.settingsStore.setLaunchAtLogin).toHaveBeenLastCalledWith(false);
    expect(harness.state.settingsError.value).toBe("autostart failed");
  });
});
