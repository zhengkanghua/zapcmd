import type { HotkeyFieldId } from "../../../stores/settingsStore";
import { t } from "../../../i18n";
import { clearSettingsErrorState, type SettingsWindowState, type UseSettingsWindowOptions } from "./model";

export interface HotkeyActions {
  startHotkeyRecording: (field: HotkeyFieldId) => void;
  cancelHotkeyRecording: () => void;
  applyRecordedHotkey: (field: HotkeyFieldId, captured: string) => void;
  isHotkeyRecording: (field: HotkeyFieldId) => boolean;
  getHotkeyDisplay: (field: HotkeyFieldId) => string;
}

export function createHotkeyActions(deps: {
  options: UseSettingsWindowOptions;
  state: SettingsWindowState;
  applyHotkeyChange: (fieldId: HotkeyFieldId, value: string) => Promise<void>;
}): HotkeyActions {
  const { options, state, applyHotkeyChange } = deps;

  function startHotkeyRecording(field: HotkeyFieldId): void {
    state.recordingHotkeyField.value = field;
    clearSettingsErrorState(state);
  }

  function cancelHotkeyRecording(): void {
    state.recordingHotkeyField.value = null;
  }

  function applyRecordedHotkey(field: HotkeyFieldId, captured: string): void {
    cancelHotkeyRecording();
    void applyHotkeyChange(field, captured);
  }

  function isHotkeyRecording(field: HotkeyFieldId): boolean {
    return state.recordingHotkeyField.value === field;
  }

  function getHotkeyDisplay(field: HotkeyFieldId): string {
    if (isHotkeyRecording(field)) {
      return t("settings.hotkeys.recording");
    }
    const value = options.getHotkeyValue(field);
    return value || t("settings.hotkeys.unset");
  }

  return {
    startHotkeyRecording,
    cancelHotkeyRecording,
    applyRecordedHotkey,
    isHotkeyRecording,
    getHotkeyDisplay
  };
}
