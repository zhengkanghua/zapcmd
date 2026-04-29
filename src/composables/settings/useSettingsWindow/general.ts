import type { TerminalReusePolicy } from "../../../stores/settingsStore";
import {
  applySettingsValidationIssue,
  clearSettingsErrorState,
  type SettingsWindowState,
  type UseSettingsWindowOptions
} from "./model";
import { t } from "../../../i18n";

export interface GeneralActions {
  setAutoCheckUpdate: (value: boolean) => void;
  setLaunchAtLogin: (value: boolean) => void;
  setAlwaysElevatedTerminal: (value: boolean) => void;
  setTerminalReusePolicy: (value: TerminalReusePolicy) => void;
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
    options.settingsStore.setAutoCheckUpdate(value);
    clearSettingsErrorState(state);
    void persistSetting();
  }

  function setLaunchAtLogin(value: boolean): void {
    void applyAutoStartChange(value);
  }

  function setAlwaysElevatedTerminal(value: boolean): void {
    options.settingsStore.setAlwaysElevatedTerminal(value);
    clearSettingsErrorState(state);
    void persistSetting();
  }

  function setTerminalReusePolicy(value: TerminalReusePolicy): void {
    options.settingsStore.setTerminalReusePolicy(value);
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
      const rawEnabled = await options.readAutoStartEnabled();
      if (typeof rawEnabled !== "boolean") {
        state.launchAtLoginBaseline.value ??= options.launchAtLogin.value;
        return;
      }
      const enabled = rawEnabled;
      state.launchAtLoginBaseline.value = enabled;
      options.settingsStore.setLaunchAtLogin(enabled);
    } catch (error) {
      console.error("read autostart status failed:", error);
      state.launchAtLoginBaseline.value ??= options.launchAtLogin.value;
      applySettingsValidationIssue(state, {
        message: error instanceof Error && error.message ? error.message : t("settings.error.readLaunchAtLoginFailed"),
        route: "general"
      });
    } finally {
      state.launchAtLoginLoading.value = false;
    }
  }

  return {
    setAutoCheckUpdate,
    setLaunchAtLogin,
    setAlwaysElevatedTerminal,
    setTerminalReusePolicy,
    loadAutoStartEnabled
  };
}
