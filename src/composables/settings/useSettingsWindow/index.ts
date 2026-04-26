import { createHotkeyActions } from "./hotkey";
import { createGeneralActions } from "./general";
import { createSettingsState, type UseSettingsWindowOptions } from "./model";
import { createPersistenceActions } from "./persistence";
import { createPointerActions } from "./pointer";
import { createRouteActions } from "./route";
import { createTerminalActions } from "./terminal";
import { createSettingsViewModel } from "./viewModel";
import type { HotkeyFieldDefinition, SettingsRoute } from "../../../features/settings/types";

export type { HotkeyFieldDefinition, SettingsRoute };

export function useSettingsWindow(options: UseSettingsWindowOptions) {
  const state = createSettingsState();
  const persistenceHooks: {
    ensureDefaultTerminal?: () => boolean;
    loadAutoStartEnabled?: () => Promise<void>;
  } = {};

  const persistence = createPersistenceActions({
    options,
    state,
    ensureDefaultTerminal: () => persistenceHooks.ensureDefaultTerminal?.() ?? false,
    loadAutoStartEnabled: () => persistenceHooks.loadAutoStartEnabled?.() ?? Promise.resolve()
  });
  const hotkey = createHotkeyActions();
  const terminal = createTerminalActions({
    options,
    state,
    persistSetting: persistence.persistSetting
  });
  persistenceHooks.ensureDefaultTerminal = terminal.ensureDefaultTerminal;
  const general = createGeneralActions({
    options,
    state,
    persistSetting: persistence.persistSetting,
    applyAutoStartChange: persistence.applyAutoStartChange
  });
  const pointer = createPointerActions({
    options,
    state,
    persistSetting: persistence.persistSetting
  });
  persistenceHooks.loadAutoStartEnabled = general.loadAutoStartEnabled;
  const route = createRouteActions({ options, state });
  const viewModel = createSettingsViewModel({ options, state });

  return {
    ...state,
    ...viewModel,
    ...hotkey,
    ...route,
    ...terminal,
    ...general,
    ...pointer,
    ...persistence,
    initializeSettings: persistence.loadSettings,
    reloadSettings: persistence.loadSettings
  };
}
