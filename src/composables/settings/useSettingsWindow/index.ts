import { createHotkeyActions } from "./hotkey";
import { createGeneralActions } from "./general";
import { createSettingsState, type UseSettingsWindowOptions } from "./model";
import { createPersistenceActions } from "./persistence";
import { createRouteActions } from "./route";
import { createTerminalActions } from "./terminal";
import { createSettingsViewModel } from "./viewModel";
import type { HotkeyFieldDefinition, SettingsRoute } from "../../../features/settings/types";

export type { HotkeyFieldDefinition, SettingsRoute };

export function useSettingsWindow(options: UseSettingsWindowOptions) {
  const state = createSettingsState();
  const hotkey = createHotkeyActions({ options, state });
  const terminal = createTerminalActions({
    options,
    state,
    cancelHotkeyRecording: hotkey.cancelHotkeyRecording
  });
  const general = createGeneralActions({ options, state });
  const route = createRouteActions({
    options,
    state,
    closeTerminalDropdown: terminal.closeTerminalDropdown
  });
  const persistence = createPersistenceActions({
    options,
    state,
    ensureDefaultTerminal: terminal.ensureDefaultTerminal,
    cancelHotkeyRecording: hotkey.cancelHotkeyRecording,
    loadAutoStartEnabled: general.loadAutoStartEnabled
  });
  const viewModel = createSettingsViewModel({ options, state });

  return {
    ...state,
    ...viewModel,
    ...hotkey,
    ...route,
    ...terminal,
    ...general,
    ...persistence
  };
}
