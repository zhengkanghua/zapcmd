import type { SettingsHandlers } from "./types";

export function handleSettingsWindowKeydown(
  event: KeyboardEvent,
  settings: SettingsHandlers
): void {
  if (event.key !== "Escape") {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  settings.closeSettingsWindow();
}
