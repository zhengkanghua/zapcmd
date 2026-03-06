import {
  clearSettingsErrorState,
  hasUnsavedSettingsChanges,
  markSettingsDirty,
  syncSettingsBaseline,
  type SettingsWindowState,
  type UseSettingsWindowOptions
} from "./model";

export interface GeneralActions {
  setAutoCheckUpdate: (value: boolean) => void;
  setLaunchAtLogin: (value: boolean) => void;
  loadAutoStartEnabled: () => Promise<void>;
}

export function createGeneralActions(deps: {
  options: UseSettingsWindowOptions;
  state: SettingsWindowState;
}): GeneralActions {
  const { options, state } = deps;

  function setAutoCheckUpdate(value: boolean): void {
    options.autoCheckUpdate.value = value;
    markSettingsDirty(state);
    clearSettingsErrorState(state);
  }

  function setLaunchAtLogin(value: boolean): void {
    options.launchAtLogin.value = value;
    markSettingsDirty(state);
    clearSettingsErrorState(state);
  }

  async function loadAutoStartEnabled(): Promise<void> {
    if (state.launchAtLoginLoading.value) {
      return;
    }

    state.launchAtLoginLoading.value = true;
    state.launchAtLoginBaseline.value ??= options.launchAtLogin.value;

    try {
      if (!options.isTauriRuntime()) {
        return;
      }
      const enabled = await options.readAutoStartEnabled();
      options.launchAtLogin.value = enabled;
      state.launchAtLoginBaseline.value = enabled;
      state.settingsSaved.value = false;
      clearSettingsErrorState(state);
      if (!hasUnsavedSettingsChanges(state, options)) {
        syncSettingsBaseline(state, options);
      }
    } catch (error) {
      console.error("read autostart status failed:", error);
      state.launchAtLoginBaseline.value ??= options.launchAtLogin.value;
    } finally {
      state.launchAtLoginLoading.value = false;
    }
  }

  return {
    setAutoCheckUpdate,
    setLaunchAtLogin,
    loadAutoStartEnabled
  };
}
