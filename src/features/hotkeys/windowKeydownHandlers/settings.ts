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

function handleSettingsTerminalDropdownKeydown(
  event: KeyboardEvent,
  settings: SettingsHandlers
): boolean {
  if (!settings.terminalDropdownOpen.value || settings.availableTerminals.value.length <= 0) {
    return false;
  }

  const maxIndex = settings.availableTerminals.value.length - 1;
  const current = settings.terminalFocusIndex.value >= 0 ? settings.terminalFocusIndex.value : 0;
  if (event.key === "ArrowDown") {
    event.preventDefault();
    settings.terminalFocusIndex.value = Math.min(current + 1, maxIndex);
    return true;
  }
  if (event.key === "ArrowUp") {
    event.preventDefault();
    settings.terminalFocusIndex.value = Math.max(current - 1, 0);
    return true;
  }
  if (event.key === "Home") {
    event.preventDefault();
    settings.terminalFocusIndex.value = 0;
    return true;
  }
  if (event.key === "End") {
    event.preventDefault();
    settings.terminalFocusIndex.value = maxIndex;
    return true;
  }
  if (event.key !== "Enter") {
    return false;
  }

  event.preventDefault();
  const option = settings.availableTerminals.value[current];
  if (option) {
    settings.selectTerminalOption(option.id);
  }
  return true;
}

export function handleSettingsWindowKeydown(
  event: KeyboardEvent,
  settings: SettingsHandlers
): void {
  if (
    handleSettingsRecordingKeydown(event, settings) ||
    handleSettingsTerminalDropdownKeydown(event, settings)
  ) {
    return;
  }
  if (event.key !== "Escape") {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  if (settings.terminalDropdownOpen.value) {
    settings.closeTerminalDropdown();
    return;
  }
  settings.closeSettingsWindow();
}
