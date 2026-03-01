import {
  getDuplicateHotkeyConflict,
  getHotkeyEntries,
  type HotkeyEntry,
  type UseSettingsWindowOptions,
  type SettingsWindowState
} from "./model";
import { t } from "../../../i18n";

const TOAST_DISMISS_DELAY_MS = 2200;

function resolveSettingsError(error: unknown, fallbackKey: string): string {
  return error instanceof Error && error.message ? error.message : t(fallbackKey);
}

function validateHotkeyEntries(entries: HotkeyEntry[]): string | null {
  const emptyHotkeyItem = entries.find((entry) => !entry.value);
  if (emptyHotkeyItem) {
    return t("settings.error.emptyHotkey", { label: emptyHotkeyItem.label });
  }

  const duplicateConflict = getDuplicateHotkeyConflict(entries);
  if (duplicateConflict) {
    return duplicateConflict;
  }

  return null;
}

function validateTerminalSelection(params: {
  options: UseSettingsWindowOptions;
  state: SettingsWindowState;
}): string | null {
  if (params.state.availableTerminals.value.length === 0) {
    return null;
  }

  const terminalValid = params.state.availableTerminals.value.some(
    (item) => item.id === params.options.defaultTerminal.value
  );
  if (!terminalValid) {
    return t("settings.error.terminalUnavailable");
  }

  return null;
}

async function applyLaunchAtLogin(params: {
  options: UseSettingsWindowOptions;
  state: SettingsWindowState;
  desiredLaunchAtLogin: boolean;
}): Promise<boolean> {
  try {
    if (params.options.isTauriRuntime()) {
      await params.options.writeAutoStartEnabled(params.desiredLaunchAtLogin);
    }
    params.state.launchAtLoginBaseline.value = params.desiredLaunchAtLogin;
    return true;
  } catch (error) {
    params.state.settingsError.value = resolveSettingsError(error, "settings.error.updateLaunchAtLoginFailed");
    return false;
  }
}

async function applyAndPersistSettings(params: {
  options: UseSettingsWindowOptions;
  state: SettingsWindowState;
  entries: HotkeyEntry[];
  launcherHotkey: string;
}): Promise<boolean> {
  if (params.options.isTauriRuntime()) {
    try {
      await params.options.writeLauncherHotkey(params.launcherHotkey);
    } catch (error) {
      params.state.settingsError.value = resolveSettingsError(error, "settings.error.updateLauncherHotkeyFailed");
      return false;
    }
  }

  for (const entry of params.entries) {
    params.options.setHotkeyValue(entry.id, entry.value);
  }

  try {
    params.options.settingsStore.persist();
  } catch (error) {
    params.state.settingsError.value = resolveSettingsError(error, "settings.error.persistSettingsFailed");
    return false;
  }

  try {
    params.options.broadcastSettingsUpdated();
  } catch (error) {
    params.state.settingsError.value = resolveSettingsError(error, "settings.error.broadcastSettingsFailed");
    return false;
  }

  return true;
}

export interface PersistenceActions {
  saveSettings: () => Promise<void>;
  loadSettings: () => void;
  clearSettingsSavedTimer: () => void;
}

export function createPersistenceActions(deps: {
  options: UseSettingsWindowOptions;
  state: SettingsWindowState;
  ensureDefaultTerminal: () => void;
  cancelHotkeyRecording: () => void;
  loadAutoStartEnabled: () => Promise<void>;
}): PersistenceActions {
  const { options, state, ensureDefaultTerminal, cancelHotkeyRecording, loadAutoStartEnabled } = deps;
  let settingsSavedTimer: ReturnType<typeof setTimeout> | null = null;

  function clearSettingsSavedTimer(): void {
    if (!settingsSavedTimer) {
      return;
    }
    clearTimeout(settingsSavedTimer);
    settingsSavedTimer = null;
  }

  function markSettingsSaved(): void {
    state.settingsSaved.value = true;
    clearSettingsSavedTimer();
    settingsSavedTimer = setTimeout(() => {
      state.settingsSaved.value = false;
      settingsSavedTimer = null;
    }, TOAST_DISMISS_DELAY_MS);
  }

  async function saveSettings(): Promise<void> {
    state.settingsError.value = "";
    state.settingsSaved.value = false;
    cancelHotkeyRecording();

    const desiredLaunchAtLogin = options.launchAtLogin.value;
    const baselineLaunchAtLogin = state.launchAtLoginBaseline.value ?? desiredLaunchAtLogin;

    const entries = getHotkeyEntries(options);
    const validationError = validateHotkeyEntries(entries);
    if (validationError) {
      state.settingsError.value = validationError;
      return;
    }

    const terminalError = validateTerminalSelection({ options, state });
    if (terminalError) {
      state.settingsError.value = terminalError;
      return;
    }

    const launcher = entries.find((entry) => entry.id === "launcher")!.value;

    if (desiredLaunchAtLogin !== baselineLaunchAtLogin) {
      const updated = await applyLaunchAtLogin({ options, state, desiredLaunchAtLogin });
      if (!updated) {
        return;
      }
    }

    const committed = await applyAndPersistSettings({ options, state, entries, launcherHotkey: launcher });
    if (!committed) {
      return;
    }

    markSettingsSaved();
  }

  function loadSettings(): void {
    options.settingsStore.hydrateFromStorage();
    ensureDefaultTerminal();
    void loadAutoStartEnabled();
  }

  return {
    saveSettings,
    loadSettings,
    clearSettingsSavedTimer
  };
}
