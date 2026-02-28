import type { SettingsWindowState, UseSettingsWindowOptions } from "./model";

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
    state.settingsSaved.value = false;
    state.settingsError.value = "";
  }

  function setLaunchAtLogin(value: boolean): void {
    options.launchAtLogin.value = value;
    state.settingsSaved.value = false;
    state.settingsError.value = "";
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
      state.settingsError.value = "";
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

