import { ref } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { setAppLocale, t } from "../../../i18n";
import type { HotkeyFieldDefinition } from "../../../features/settings/types";
import { createDefaultSettingsSnapshot, type HotkeyFieldId } from "../../../stores/settingsStore";
import { createHotkeyActions } from "../../settings/useSettingsWindow/hotkey";
import { createSettingsState, type UseSettingsWindowOptions } from "../../settings/useSettingsWindow/model";

function createOptions(overrides: Partial<UseSettingsWindowOptions> = {}): UseSettingsWindowOptions {
  const baseSnapshot = createDefaultSettingsSnapshot();

  const settingsStore = {
    persist: vi.fn(),
    hydrateFromStorage: vi.fn(),
    toSnapshot: vi.fn(() => baseSnapshot),
    applySnapshot: vi.fn(),
    setHotkey: vi.fn(),
    setLaunchAtLogin: vi.fn()
  };

  const hotkeyDefinitions: HotkeyFieldDefinition[] = [
    { id: "launcher", label: "launcher", scope: "global" },
    { id: "toggleQueue", label: "toggleQueue", scope: "global" }
  ];

  const hotkeys: Partial<Record<HotkeyFieldId, string>> = {
    launcher: "Alt+K"
  };

  return {
    settingsHashPrefix: "#settings:",
    hotkeyDefinitions,
    isSettingsWindow: ref(true),
    defaultTerminal: ref("powershell"),
    language: ref("zh-CN"),
    autoCheckUpdate: ref(true),
    launchAtLogin: ref(false),
    settingsStore,
    getHotkeyValue: vi.fn((field: HotkeyFieldId) => hotkeys[field] ?? ""),
    setHotkeyValue: vi.fn((field: HotkeyFieldId, value: string) => {
      hotkeys[field] = value;
    }),
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

describe("useSettingsWindow hotkey actions", () => {
  beforeEach(() => {
    setAppLocale("zh-CN");
  });

  it("starts and cancels hotkey recording", () => {
    const options = createOptions();
    const state = createSettingsState();
    const applyHotkeyChange = vi.fn(async () => {});

    state.settingsError.value = "some error";
    state.settingsErrorRoute.value = "general";
    state.settingsErrorHotkeyFieldIds.value = ["launcher"];
    state.settingsErrorPrimaryHotkeyField.value = "launcher";

    const actions = createHotkeyActions({ options, state, applyHotkeyChange });

    actions.startHotkeyRecording("launcher");
    expect(state.recordingHotkeyField.value).toBe("launcher");
    expect(state.settingsError.value).toBe("");
    expect(state.settingsErrorRoute.value).toBeNull();
    expect(state.settingsErrorHotkeyFieldIds.value).toEqual([]);
    expect(state.settingsErrorPrimaryHotkeyField.value).toBeNull();

    actions.cancelHotkeyRecording();
    expect(state.recordingHotkeyField.value).toBeNull();
  });

  it("applies captured hotkey via persistence hook", () => {
    const options = createOptions();
    const state = createSettingsState();
    const applyHotkeyChange = vi.fn(async () => {});

    state.recordingHotkeyField.value = "launcher";
    const actions = createHotkeyActions({ options, state, applyHotkeyChange });

    actions.applyRecordedHotkey("launcher", "Alt+X");
    expect(state.recordingHotkeyField.value).toBeNull();
    expect(applyHotkeyChange).toHaveBeenCalledWith("launcher", "Alt+X");
  });

  it("reports recording state and resolves display text", () => {
    const applyHotkeyChange = vi.fn(async () => {});

    const optionsWithUnset = createOptions({
      getHotkeyValue: vi.fn(() => "")
    });
    const stateUnset = createSettingsState();
    const actionsUnset = createHotkeyActions({ options: optionsWithUnset, state: stateUnset, applyHotkeyChange });
    expect(actionsUnset.isHotkeyRecording("launcher")).toBe(false);
    expect(actionsUnset.getHotkeyDisplay("launcher")).toBe(t("settings.hotkeys.unset"));

    const optionsWithValue = createOptions({
      getHotkeyValue: vi.fn(() => "Ctrl+K")
    });
    const stateValue = createSettingsState();
    const actionsValue = createHotkeyActions({ options: optionsWithValue, state: stateValue, applyHotkeyChange });
    expect(actionsValue.getHotkeyDisplay("launcher")).toBe("Ctrl+K");

    const optionsRecording = createOptions({
      getHotkeyValue: vi.fn(() => "Ctrl+K")
    });
    const stateRecording = createSettingsState();
    stateRecording.recordingHotkeyField.value = "launcher";
    const actionsRecording = createHotkeyActions({
      options: optionsRecording,
      state: stateRecording,
      applyHotkeyChange
    });
    expect(actionsRecording.isHotkeyRecording("launcher")).toBe(true);
    expect(actionsRecording.getHotkeyDisplay("launcher")).toBe(t("settings.hotkeys.recording"));
  });
});

