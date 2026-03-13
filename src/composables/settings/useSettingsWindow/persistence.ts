import {
  applySettingsValidationIssue,
  clearSettingsErrorState,
  getDuplicateHotkeyIssue,
  getHotkeyEntries,
  hasUnsavedSettingsChanges,
  resetSettingsDirty,
  restoreSettingsBaseline,
  syncSettingsBaseline,
  type HotkeyEntry,
  type SettingsValidationIssue,
  type UseSettingsWindowOptions,
  type SettingsWindowState
} from "./model";
import { t } from "../../../i18n";

const TOAST_DISMISS_DELAY_MS = 2200;

function resolveSettingsError(error: unknown, fallbackKey: string): string {
  return error instanceof Error && error.message ? error.message : t(fallbackKey);
}

function validateHotkeyEntries(params: {
  entries: HotkeyEntry[];
  state: SettingsWindowState;
}): SettingsValidationIssue | null {
  const { entries, state } = params;
  const emptyHotkeyItem = entries.find((entry) => !entry.value && !entry.optional);
  if (emptyHotkeyItem) {
    return {
      message: t("settings.error.emptyHotkey", { label: emptyHotkeyItem.label }),
      route: "hotkeys",
      hotkeyFieldIds: [emptyHotkeyItem.id],
      primaryHotkeyField: emptyHotkeyItem.id
    };
  }

  const duplicateConflict = getDuplicateHotkeyIssue(entries, state.lastEditedHotkeyField.value);
  if (duplicateConflict) {
    return duplicateConflict;
  }

  return null;
}

function validateTerminalSelection(params: {
  options: UseSettingsWindowOptions;
  state: SettingsWindowState;
}): SettingsValidationIssue | null {
  if (params.state.availableTerminals.value.length === 0) {
    return null;
  }

  const terminalValid = params.state.availableTerminals.value.some(
    (item) => item.id === params.options.defaultTerminal.value
  );
  if (!terminalValid) {
    return {
      message: t("settings.error.terminalUnavailable"),
      route: "general"
    };
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
    applySettingsValidationIssue(params.state, {
      message: resolveSettingsError(error, "settings.error.updateLaunchAtLoginFailed"),
      route: "general"
    });
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
      applySettingsValidationIssue(params.state, {
        message: resolveSettingsError(error, "settings.error.updateLauncherHotkeyFailed"),
        route: "hotkeys"
      });
      return false;
    }
  }

  for (const entry of params.entries) {
    params.options.setHotkeyValue(entry.id, entry.value);
  }

  try {
    params.options.settingsStore.persist();
  } catch (error) {
    applySettingsValidationIssue(params.state, {
      message: resolveSettingsError(error, "settings.error.persistSettingsFailed"),
      route: null
    });
    return false;
  }

  try {
    params.options.broadcastSettingsUpdated();
  } catch (error) {
    applySettingsValidationIssue(params.state, {
      message: resolveSettingsError(error, "settings.error.broadcastSettingsFailed"),
      route: null
    });
    return false;
  }

  return true;
}

export interface PersistenceActions {
  saveSettings: () => Promise<void>;
  loadSettings: () => void;
  clearSettingsSavedTimer: () => void;
  hasUnsavedSettingsChanges: () => boolean;
  prepareToCloseSettingsWindow: () => boolean;
  cancelCloseConfirm: () => void;
  discardUnsavedChanges: () => void;
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
    clearSettingsErrorState(state);
    state.settingsSaved.value = false;
    cancelHotkeyRecording();

    const desiredLaunchAtLogin = options.launchAtLogin.value;
    const baselineLaunchAtLogin = state.launchAtLoginBaseline.value ?? desiredLaunchAtLogin;

    const entries = getHotkeyEntries(options);
    const validationError = validateHotkeyEntries({ entries, state });
    if (validationError) {
      applySettingsValidationIssue(state, validationError);
      return;
    }

    const terminalError = validateTerminalSelection({ options, state });
    if (terminalError) {
      applySettingsValidationIssue(state, terminalError);
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

    syncSettingsBaseline(state, options);
    markSettingsSaved();
  }

  function loadSettings(): void {
    options.settingsStore.hydrateFromStorage();
    ensureDefaultTerminal();
    syncSettingsBaseline(state, options);
    void loadAutoStartEnabled().finally(() => {
      if (!hasUnsavedSettingsChanges(state, options)) {
        syncSettingsBaseline(state, options);
      }
    });
  }

  function prepareToCloseSettingsWindow(): boolean {
    cancelHotkeyRecording();
    clearSettingsSavedTimer();
    state.settingsSaved.value = false;

    if (!hasUnsavedSettingsChanges(state, options)) {
      state.closeConfirmOpen.value = false;
      clearSettingsErrorState(state);
      return true;
    }

    state.closeConfirmOpen.value = true;
    return false;
  }

  function cancelCloseConfirm(): void {
    state.closeConfirmOpen.value = false;
  }

  function discardUnsavedChanges(): void {
    restoreSettingsBaseline(state, options);
    state.launchAtLoginBaseline.value = options.launchAtLogin.value;
    resetSettingsDirty(state);
    clearSettingsErrorState(state);
    state.closeConfirmOpen.value = false;
  }

  return {
    saveSettings,
    loadSettings,
    clearSettingsSavedTimer,
    hasUnsavedSettingsChanges: () => hasUnsavedSettingsChanges(state, options),
    prepareToCloseSettingsWindow,
    cancelCloseConfirm,
    discardUnsavedChanges
  };
}
