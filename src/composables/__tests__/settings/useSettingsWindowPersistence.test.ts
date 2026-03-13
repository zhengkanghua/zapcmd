import { ref } from "vue";
import { describe, expect, it, vi } from "vitest";

import type { HotkeyFieldDefinition } from "../../../features/settings/types";
import { createDefaultSettingsSnapshot } from "../../../stores/settingsStore";
import { createPersistenceActions } from "../../settings/useSettingsWindow/persistence";
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
        language: "zh-CN" as const,
        autoCheckUpdate: true,
        launchAtLogin: false
      }
    })),
    applySnapshot: vi.fn()
  };

  const options: UseSettingsWindowOptions = {
    settingsHashPrefix: "#settings:",
    hotkeyDefinitions,
    isSettingsWindow: ref(true),
    defaultTerminal: ref("powershell"),
    language: ref("zh-CN"),
    autoCheckUpdate: ref(true),
    launchAtLogin: ref(false),
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
  state.launchAtLoginBaseline.value = options.launchAtLogin.value;

  const ensureDefaultTerminal = vi.fn();
  const cancelHotkeyRecording = vi.fn();
  const loadAutoStartEnabled = vi.fn(async () => {});

  const actions = createPersistenceActions({
    options,
    state,
    ensureDefaultTerminal,
    cancelHotkeyRecording,
    loadAutoStartEnabled
  });

  return {
    options,
    settingsStore,
    state,
    actions,
    cancelHotkeyRecording
  };
}

describe("useSettingsWindow persistence", () => {
  it("opens an in-app discard confirmation instead of window.confirm", () => {
    const harness = createHarness();
    harness.state.settingsDirty.value = true;

    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValueOnce(true);

    const allowed = harness.actions.prepareToCloseSettingsWindow();

    expect(allowed).toBe(false);
    expect(harness.state.closeConfirmOpen.value).toBe(true);
    expect(confirmSpy).not.toHaveBeenCalled();

    confirmSpy.mockRestore();
  });

  it("discards unsaved changes and closes the confirmation when requested", () => {
    const harness = createHarness();
    harness.state.settingsDirty.value = true;
    harness.state.settingsError.value = "pending error";

    const baseline = harness.options.settingsStore.toSnapshot();
    harness.state.settingsBaselineSnapshot.value = baseline;

    harness.actions.prepareToCloseSettingsWindow();
    expect(harness.state.closeConfirmOpen.value).toBe(true);

    harness.actions.discardUnsavedChanges();

    expect(harness.settingsStore.applySnapshot).toHaveBeenCalledWith(baseline);
    expect(harness.state.settingsDirty.value).toBe(false);
    expect(harness.state.closeConfirmOpen.value).toBe(false);
    expect(harness.state.settingsError.value).toBe("");
  });

  it("reports launcher hotkey write failures", async () => {
    const harness = createHarness({
      isTauriRuntime: () => true
    });
    vi.mocked(harness.options.writeLauncherHotkey).mockRejectedValueOnce(new Error("hotkey write failed"));

    await harness.actions.saveSettings();

    expect(harness.cancelHotkeyRecording).toHaveBeenCalledTimes(1);
    expect(harness.options.writeLauncherHotkey).toHaveBeenCalledWith("Alt+K");
    expect(harness.settingsStore.persist).not.toHaveBeenCalled();
    expect(harness.options.broadcastSettingsUpdated).not.toHaveBeenCalled();
    expect(harness.state.settingsError.value).toBe("hotkey write failed");
    expect(harness.state.settingsSaved.value).toBe(false);
  });

  it("reports persistence failures separately from launcher hotkey update", async () => {
    const harness = createHarness({
      isTauriRuntime: () => false
    });
    harness.settingsStore.persist.mockImplementationOnce(() => {
      throw new Error("persist failed");
    });

    await harness.actions.saveSettings();

    expect(harness.options.writeLauncherHotkey).not.toHaveBeenCalled();
    expect(harness.settingsStore.persist).toHaveBeenCalledTimes(1);
    expect(harness.options.broadcastSettingsUpdated).not.toHaveBeenCalled();
    expect(harness.state.settingsError.value).toBe("persist failed");
  });

  it("reports broadcast failures separately from persistence", async () => {
    const harness = createHarness({
      isTauriRuntime: () => false
    });
    vi.mocked(harness.options.broadcastSettingsUpdated).mockImplementationOnce(() => {
      throw new Error("broadcast failed");
    });

    await harness.actions.saveSettings();

    expect(harness.settingsStore.persist).toHaveBeenCalledTimes(1);
    expect(harness.state.settingsError.value).toBe("broadcast failed");
  });

  it("reports launch at login update failures", async () => {
    const harness = createHarness({
      isTauriRuntime: () => true,
      launchAtLogin: ref(true)
    });
    harness.state.launchAtLoginBaseline.value = false;
    vi.mocked(harness.options.writeAutoStartEnabled).mockRejectedValueOnce(new Error("autostart failed"));

    await harness.actions.saveSettings();

    expect(harness.options.writeAutoStartEnabled).toHaveBeenCalledWith(true);
    expect(harness.options.writeLauncherHotkey).not.toHaveBeenCalled();
    expect(harness.settingsStore.persist).not.toHaveBeenCalled();
    expect(harness.state.settingsError.value).toBe("autostart failed");
  });

  it("recovers on next save after a persistence failure", async () => {
    const harness = createHarness({
      isTauriRuntime: () => false
    });
    harness.settingsStore.persist.mockImplementationOnce(() => {
      throw new Error("persist failed");
    });

    await harness.actions.saveSettings();
    expect(harness.state.settingsError.value).toBe("persist failed");
    expect(harness.state.settingsSaved.value).toBe(false);
    expect(harness.options.broadcastSettingsUpdated).not.toHaveBeenCalled();

    await harness.actions.saveSettings();

    expect(harness.settingsStore.persist).toHaveBeenCalledTimes(2);
    expect(harness.options.broadcastSettingsUpdated).toHaveBeenCalledTimes(1);
    expect(harness.state.settingsError.value).toBe("");
    expect(harness.state.settingsSaved.value).toBe(true);
  });
});
