import { hotkeyFromKeyboardEvent } from "../../../shared/hotkeys";
import type { SettingsHandlers } from "./types";

function handleSettingsRecordingKeydown(
  event: KeyboardEvent,
  settings: SettingsHandlers
): boolean {
  if (!settings.recordingHotkeyField.value) {
    return false;
  }

  event.preventDefault();
  event.stopPropagation();
  if (event.key === "Escape") {
    settings.cancelHotkeyRecording();
    return true;
  }

  const captured = hotkeyFromKeyboardEvent(event);
  if (!captured) {
    return true;
  }
  settings.applyRecordedHotkey(settings.recordingHotkeyField.value, captured);
  return true;
}

export function handleSettingsWindowKeydown(
  event: KeyboardEvent,
  settings: SettingsHandlers
): void {
  if (handleSettingsRecordingKeydown(event, settings)) {
    return;
  }
  if (event.key !== "Escape") {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  settings.closeSettingsWindow();
}
