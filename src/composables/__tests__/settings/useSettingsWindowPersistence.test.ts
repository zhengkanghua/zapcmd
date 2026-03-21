import { ref } from "vue";
import { describe, expect, it, vi } from "vitest";

import type { HotkeyFieldDefinition } from "../../../features/settings/types";
import { createDefaultSettingsSnapshot, type HotkeyFieldId } from "../../../stores/settingsStore";
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
        terminalReusePolicy: "never" as const,
        language: "zh-CN" as const,
        autoCheckUpdate: true,
        launchAtLogin: false
      }
    })),
    applySnapshot: vi.fn(),
    setHotkey: vi.fn(),
    setLaunchAtLogin: vi.fn(),
    setAlwaysElevatedTerminal: vi.fn(),
    setTerminalReusePolicy: vi.fn()
  };

  const options: UseSettingsWindowOptions = {
    settingsHashPrefix: "#settings:",
    hotkeyDefinitions,
    isSettingsWindow: ref(true),
    defaultTerminal: ref("powershell"),
    terminalReusePolicy: ref("never"),
    language: ref("zh-CN"),
    autoCheckUpdate: ref(true),
    launchAtLogin: ref(false),
    alwaysElevatedTerminal: ref(false),
    settingsStore,
    getHotkeyValue: vi.fn(() => "Alt+K"),
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

  const state = createSettingsState();
  const terminalRefs: { ensureDefaultTerminal?: () => boolean } = {};

  const actions = createPersistenceActions({
    options,
    state,
    ensureDefaultTerminal: () => terminalRefs.ensureDefaultTerminal?.() ?? false
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
  it("persists corrected default terminal after loadSettings fallback", async () => {
    const harness = createHarness({
      defaultTerminal: ref("ghost"),
      fallbackTerminalOptions: () => [{ id: "cmd", label: "Command Prompt", path: "cmd.exe" }]
    });

    harness.actions.loadSettings();

    expect(harness.options.defaultTerminal.value).toBe("cmd");
    expect(harness.settingsStore.persist).toHaveBeenCalledTimes(1);
    expect(harness.options.broadcastSettingsUpdated).toHaveBeenCalledTimes(1);
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
