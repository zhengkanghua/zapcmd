import { clearSettingsErrorState, type SettingsWindowState, type UseSettingsWindowOptions } from "./model";

export interface GeneralActions {
  setAutoCheckUpdate: (value: boolean) => void;
  setLaunchAtLogin: (value: boolean) => void;
  setAlwaysElevatedTerminal: (value: boolean) => void;
  loadAutoStartEnabled: () => Promise<void>;
}

export function createGeneralActions(deps: {
  options: UseSettingsWindowOptions;
  state: SettingsWindowState;
  persistSetting: () => Promise<void>;
  applyAutoStartChange: (enabled: boolean) => Promise<void>;
}): GeneralActions {
  const { options, state, persistSetting, applyAutoStartChange } = deps;

  function setAutoCheckUpdate(value: boolean): void {
    options.autoCheckUpdate.value = value;
    clearSettingsErrorState(state);
    void persistSetting();
  }

  function setLaunchAtLogin(value: boolean): void {
    void applyAutoStartChange(value);
  }

  function setAlwaysElevatedTerminal(value: boolean): void {
    options.alwaysElevatedTerminal.value = value;
    options.settingsStore.setAlwaysElevatedTerminal(value);
    clearSettingsErrorState(state);
    void persistSetting();
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
      clearSettingsErrorState(state);
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
    setAlwaysElevatedTerminal,
    loadAutoStartEnabled
  };
}
