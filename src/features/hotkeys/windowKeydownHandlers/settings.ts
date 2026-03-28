import { shouldDeferGlobalEscape } from "../escapeOwnership";
import type { SettingsHandlers } from "./types";

export function handleSettingsWindowKeydown(
  event: KeyboardEvent,
  settings: SettingsHandlers
): void {
  if (event.key !== "Escape") {
    return;
  }
  if (shouldDeferGlobalEscape(event)) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  settings.closeSettingsWindow();
}
