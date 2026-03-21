import { ref } from "vue";
import type { CommandManagementViewState } from "../../../features/settings/types";
import type { HotkeyFieldId } from "../../../stores/settingsStore";
import { createAppShellVm } from "./appShellVm";
import type { createAppCompositionContext } from "./context";
import { createLauncherVm } from "./launcherVm";
import type { createAppCompositionRuntime } from "./runtime";
import { createSettingsVm } from "./settingsVm";

type AppCompositionContext = ReturnType<typeof createAppCompositionContext>;
type AppCompositionRuntime = ReturnType<typeof createAppCompositionRuntime>;

const SETTINGS_SAVED_TOAST_DISMISS_DELAY_MS = 2200;

function createSettingsMutationHandlers(context: AppCompositionContext) {
  let settingsSavedTimer: ReturnType<typeof setTimeout> | null = null;
  const settingsSaved = ref(false);

  function clearSettingsSavedTimer(): void {
    if (!settingsSavedTimer) {
      return;
    }
    clearTimeout(settingsSavedTimer);
    settingsSavedTimer = null;
  }

  function resetSavedToast(): void {
    settingsSaved.value = false;
    clearSettingsSavedTimer();
  }

  function markSavedToast(): void {
    resetSavedToast();
    settingsSaved.value = true;
    settingsSavedTimer = setTimeout(() => {
      settingsSaved.value = false;
      settingsSavedTimer = null;
    }, SETTINGS_SAVED_TOAST_DISMISS_DELAY_MS);
  }

  function persistImmediate(): void {
    resetSavedToast();
    void context.settingsWindow.persistSetting().then(() => {
      if (!context.settingsWindow.settingsError.value) {
        markSavedToast();
      }
    });
  }

  return {
    settingsSaved,
    clearSettingsSavedTimer,
    applyHotkeyChange(fieldId: HotkeyFieldId, value: string): void {
      resetSavedToast();
      void context.settingsWindow.applyHotkeyChange(fieldId, value).then(() => {
        if (!context.settingsWindow.settingsError.value) {
          markSavedToast();
        }
      });
    },
    toggleCommandEnabled(commandId: string, enabled: boolean): void {
      context.commandManagement.toggleCommandEnabled(commandId, enabled);
      persistImmediate();
    },
    setFilteredCommandsEnabled(enabled: boolean): void {
      context.commandManagement.setFilteredCommandsEnabled(enabled);
      persistImmediate();
    },
    updateCommandView(patch: Partial<CommandManagementViewState>): void {
      context.commandManagement.updateCommandView(patch);
    },
    resetCommandFilters(): void {
      context.commandManagement.resetCommandFilters();
    },
    setWindowOpacity(value: number): void {
      context.setWindowOpacity(value);
      persistImmediate();
    },
    setTheme(value: string): void {
      context.setTheme(value);
      persistImmediate();
    },
    setBlurEnabled(value: boolean): void {
      context.setBlurEnabled(value);
      persistImmediate();
    },
    async saveSettings(): Promise<void> {
      resetSavedToast();
      await context.settingsWindow.persistSetting();
      if (!context.settingsWindow.settingsError.value) {
        markSavedToast();
      }
    }
  };
}

export function createAppCompositionViewModel(
  context: AppCompositionContext,
  runtime: AppCompositionRuntime
) {
  const settingsMutationHandlers = createSettingsMutationHandlers(context);
  const launcherVm = createLauncherVm(context, runtime);
  const settingsVm = createSettingsVm(context, settingsMutationHandlers);
  const appShellVm = createAppShellVm(runtime, settingsMutationHandlers);

  return {
    isSettingsWindow: context.isSettingsWindow,
    launcherVm,
    settingsVm,
    appShellVm
  };
}
