import { proxyRefs } from "vue";
import type { createAppCompositionRuntime } from "./runtime";

type AppCompositionRuntime = ReturnType<typeof createAppCompositionRuntime>;

interface SettingsShellState {
  settingsSaved: { value: boolean };
  saveSettings: () => Promise<void>;
}

export function createAppShellVm(
  runtime: AppCompositionRuntime,
  settingsShellState: SettingsShellState
) {
  return proxyRefs({
    settingsSaved: settingsShellState.settingsSaved,
    closeSettingsWindow: runtime.closeSettingsWindow,
    forceCloseSettingsWindow: runtime.forceCloseSettingsWindow,
    hideMainWindow: runtime.hideMainWindow,
    saveSettings: settingsShellState.saveSettings,
    setExecutionFeedback: runtime.commandExecution.setExecutionFeedback
  });
}
