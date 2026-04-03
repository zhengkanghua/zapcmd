import { hotkeyMatches } from "../../../shared/hotkeys";
import { shouldDeferGlobalEscape } from "../escapeOwnership";
import {
  ensureSearchFocusZone,
  handleMainGlobalHotkeys,
  handleQueueZoneHotkeys,
  handleSearchZoneHotkeys,
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

    const flowOpen = options.main.commandPageOpen.value;

    ensureSearchFocusZone(event, options.main);
    if (
      handleMainGlobalHotkeys(event, options.main) ||
      (!flowOpen && handleSearchZoneHotkeys(event, options.main)) ||
      handleQueueZoneHotkeys(event, options.main)
    ) {
      return;
    }
    if (!hotkeyMatches(event, options.main.normalizedEscapeHotkey.value)) {
      return;
    }
    if (
      shouldDeferGlobalEscape(event, {
        allowTypingTarget: options.main.searchInputRef.value,
        isTypingTarget: options.main.isTypingElement
      })
    ) {
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
