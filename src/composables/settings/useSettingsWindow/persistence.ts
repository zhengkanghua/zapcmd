import { getDuplicateHotkeyConflict, getHotkeyEntries, type UseSettingsWindowOptions, type SettingsWindowState } from "./model";
import { t } from "../../../i18n";

const TOAST_DISMISS_DELAY_MS = 2200;

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

  async function saveSettings(): Promise<void> {
    state.settingsError.value = "";
    state.settingsSaved.value = false;
    cancelHotkeyRecording();

    const desiredLaunchAtLogin = options.launchAtLogin.value;
    const baselineLaunchAtLogin = state.launchAtLoginBaseline.value ?? desiredLaunchAtLogin;

    const entries = getHotkeyEntries(options);
    const emptyHotkeyItem = entries.find((entry) => !entry.value);
    if (emptyHotkeyItem) {
      state.settingsError.value = t("settings.error.emptyHotkey", { label: emptyHotkeyItem.label });
      return;
    }

    const duplicateConflict = getDuplicateHotkeyConflict(entries);
    if (duplicateConflict) {
      state.settingsError.value = duplicateConflict;
      return;
    }

    if (state.availableTerminals.value.length > 0) {
      const terminalValid = state.availableTerminals.value.some(
        (item) => item.id === options.defaultTerminal.value
      );
      if (!terminalValid) {
        state.settingsError.value = t("settings.error.terminalUnavailable");
        return;
      }
    }

    const launcher = entries.find((entry) => entry.id === "launcher")!.value;

    if (desiredLaunchAtLogin !== baselineLaunchAtLogin) {
      try {
        if (options.isTauriRuntime()) {
          await options.writeAutoStartEnabled(desiredLaunchAtLogin);
        }
        state.launchAtLoginBaseline.value = desiredLaunchAtLogin;
      } catch (error) {
        state.settingsError.value =
          error instanceof Error ? error.message : t("settings.error.updateLaunchAtLoginFailed");
        return;
      }
    }

    try {
      if (options.isTauriRuntime()) {
        await options.writeLauncherHotkey(launcher);
      }
      for (const entry of entries) {
        options.setHotkeyValue(entry.id, entry.value);
      }

      options.settingsStore.persist();
      options.broadcastSettingsUpdated();
      state.settingsSaved.value = true;
      clearSettingsSavedTimer();
      settingsSavedTimer = setTimeout(() => {
        state.settingsSaved.value = false;
        settingsSavedTimer = null;
      }, TOAST_DISMISS_DELAY_MS);
    } catch (error) {
      state.settingsError.value =
        error instanceof Error ? error.message : t("settings.error.updateLauncherHotkeyFailed");
    }
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
