import { hotkeyMatches } from "../../../shared/hotkeys";
import {
  ensureSearchFocusZone,
  handleMainGlobalHotkeys,
  handleSearchZoneHotkeys,
  handleStagingZoneHotkeys
} from "./main";
import { handleSettingsWindowKeydown } from "./settings";
import type { WindowKeydownHandlerOptions } from "./types";

export function createWindowKeydownHandler<TItem>(
  options: WindowKeydownHandlerOptions<TItem>
) {
  return function onWindowKeydown(event: KeyboardEvent): void {
    if (options.isSettingsWindow.value) {
      handleSettingsWindowKeydown(event, options.settings);
      return;
    }

    if (options.main.safetyDialogOpen.value) {
      const isPlainEnter =
        event.key === "Enter" &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey &&
        !event.shiftKey;
      if (isPlainEnter) {
        event.preventDefault();
        event.stopPropagation();
        void options.main.confirmSafetyExecution();
        return;
      }
      if (hotkeyMatches(event, options.main.normalizedEscapeHotkey.value)) {
        event.preventDefault();
        event.stopPropagation();
        options.main.cancelSafetyExecution();
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    if (options.main.paramDialogOpen.value) {
      if (hotkeyMatches(event, options.main.normalizedEscapeHotkey.value)) {
        event.preventDefault();
        event.stopPropagation();
        options.main.handleMainEscape();
      }
      return;
    }

    ensureSearchFocusZone(event, options.main);
    if (
      handleMainGlobalHotkeys(event, options.main) ||
      handleSearchZoneHotkeys(event, options.main) ||
      handleStagingZoneHotkeys(event, options.main)
    ) {
      return;
    }
    if (!hotkeyMatches(event, options.main.normalizedEscapeHotkey.value)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    options.main.handleMainEscape();
  };
}

export type {
  MainHandlers,
  RefLike,
  SettingsHandlers,
  WindowKeydownHandlerOptions
} from "./types";
